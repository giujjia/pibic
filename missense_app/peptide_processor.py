import re
import os
import tempfile
from django.conf import settings
import uuid

def process_peptide_data(input_data, input_type='text'):
    # Criar um ID único para este processamento
    process_id = str(uuid.uuid4())
    
    # Definir caminhos de arquivos temporários
    temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp', process_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    input_file = os.path.join(temp_dir, 'input.txt')
    dbsaida_file = os.path.join(temp_dir, 'dbsaida.txt')
    dbpepmutref_file = os.path.join(temp_dir, 'dbpepmutref.txt')
    dbfinal_file = os.path.join(temp_dir, 'dbfinal.txt')
    
    # Salvar os dados de entrada em um arquivo
    if input_type == 'text':
        with open(input_file, 'w') as f:
            f.write(input_data)
    else:  
        with open(input_file, 'wb') as f:
            for chunk in input_data.chunks():
                f.write(chunk)
    
    proteinas_file = os.path.join(settings.BASE_DIR, 'data', 'RefSeqhumanFullNP.fasta')
    process_mutations(proteinas_file, input_file, dbsaida_file, dbpepmutref_file, dbfinal_file)
    
    # Ler os resultados e pegar as primeiras 10 linhas
    results = {}
    for file_type in ['dbpepmutref', 'dbsaida', 'dbfinal']:
        file_path = os.path.join(temp_dir, f'{file_type}.txt')
        try:
            with open(file_path, 'r') as f:
                content = ''.join(f.readlines()[:10])
                results[file_type] = content
        except Exception as e:
            results[file_type] = f"Erro ao ler o arquivo: {str(e)}"
    
    session_data = {
        'dbpepmutref_path': dbpepmutref_file,
        'dbsaida_path': dbsaida_file,
        'dbfinal_path': dbfinal_file,
        'process_id': process_id
    }
    
    return results, session_data

def process_mutations(proteinas, mutacao, dbsaida, dbpepmutref, dbfinal):
    amino = {
        "Ala": "a", "Arg": "r", "Asn": "n", "Asp": "d", "Cys": "c", "Gln": "q", "Glu": "e", "Gly": "g", "His": "h",
        "Ile": "i", "Leu": "l", "Lys": "k", "Met": "m", "Phe": "f", "Pro": "p", "Ser": "s", "Thr": "t", "Trp": "w",
        "Tyr": "y", "Val": "v", "Ter": "z",
        "A": "a", "R": "r", "N": "n", "D": "d", "C": "c", "Q": "q", "E": "e", "G": "g", "H": "h",
        "I": "i", "L": "l", "K": "k", "M": "m", "F": "f", "P": "p", "S": "s", "T": "t", "W": "w",
        "Y": "y", "V": "v", "Z": "z"
    }

    idnp = None
    hash_proteinas = {}
    concat_peptideo = ""  
    prev_id = None 

    try:
        with open(proteinas, 'r') as PROTEINAS, \
             open(mutacao, 'r') as DBSNP, \
             open(dbsaida, 'w') as DBSAIDA, \
             open(dbpepmutref, 'w') as DBRELACAO, \
             open(dbfinal, 'w') as DBFINAL: 

            # Processando o arquivo de proteínas
            for lin in PROTEINAS:
                lin = lin.strip().replace('\r', '')
                if lin.startswith(">"):
                    head = lin.split("|")
                    if len(head) > 3:
                        idnp = head[3].split('.')[0]
                        hash_proteinas[idnp] = ""
                else:
                    if idnp is not None:
                        hash_proteinas[idnp] += lin

            # Processando o arquivo de mutações
            for lin in DBSNP:
                lin = lin.strip().replace('\r', '')
                
                # Tratar diferentes formatos de entrada (espaços ou tabs)
                if '\t' in lin:
                    linhas = lin.split('\t')
                else:
                    linhas = lin.split()
                
                # Verifica se a linha tem o número esperado de colunas
                if len(linhas) < 5:
                    continue

                id_ = linhas[0].split('.')[0]
                snp = linhas[1]
                ref = linhas[2]
                try:
                    pos = int(linhas[3])
                except ValueError:
                    continue  # Pular linhas com posição inválida
                alt = linhas[4]
                mutacao = f"p.{ref}{pos}{alt}"

                if id_ in hash_proteinas:
                    aminoacidos = hash_proteinas[id_]
                    
                    # Verificar se a posição é válida
                    if pos <= 0 or pos > len(aminoacidos):
                        continue
                    
                    # Verificar se aminoácidos ref e alt estão no dicionário
                    if ref not in amino and ref not in amino.values():
                        continue
                    if alt not in amino and alt not in amino.values():
                        continue
                    
                    # Converter para código de uma letra se necessário
                    ref_one_letter = amino.get(ref, ref.lower())
                    alt_one_letter = amino.get(alt, alt.lower())
                    
                    # Substituir o aminoácido na posição correta
                    aminoacidos = aminoacidos[:pos - 1] + alt_one_letter + aminoacidos[pos:]

                    pattern = re.compile(r'([^RK]+(R|K|$))')
                    for match in pattern.finditer(aminoacidos):
                        pepmutado = match.group(1)
                        tam_pep = len(pepmutado)
                        if 7 <= tam_pep <= 35 and re.search(r'[a-z]', pepmutado):
                            aminoref = ref_one_letter
                            aminomut = alt_one_letter
                            pepref = pepmutado.replace(aminomut, aminoref)

                            sitiopos = aminoacidos.find(pepmutado)

                            if sitiopos == 0:
                                pepmutado = pepmutado + pepmutado[1:]
                            
                            if re.search(r'[r|k]', pepmutado):  # Verifica se um novo peptídeo tríptico foi criado
                                peptriptico = ""
                                pattern = re.compile(r'([^RK]+(R|K|$))', re.IGNORECASE)  # Busca novamente fragmentos trípticos
                                for match in pattern.finditer(pepmutado):
                                    pep = match.group(1)
                                    if len(pep) >= 7:
                                        peptriptico += pep  # Concatena fragmentos com tamanho adequado
                                pepmutado = peptriptico 
                            
                            if 'z' in pepmutado:
                                stop = 'z'
                                pos_stop = pepmutado.index(stop)
                                pepstop = pepmutado[:pos_stop]
                                if len(pepstop) >= 7:
                                    pepmutado = pepstop
                            
                            if pepmutado: 
                                DBSAIDA.write(f">{id_}\n{pepmutado}\n")

                                if prev_id and prev_id != id_: #verificação para caso o id mudar
                                    DBFINAL.write(f">{prev_id}\n{concat_peptideo}\n")
                                    concat_peptideo = ""

                                prev_id = id_
                                concat_peptideo += pepmutado #concatena o pep

                                pattern = re.compile(r'([^RK]+(R|K|$))', re.IGNORECASE)
                                for match in pattern.finditer(pepmutado):
                                    pepmut = match.group(1)
                                    sitiopos = aminoacidos.find(pepmut)
                                    DBRELACAO.write(f">{id_}\t{snp}\t{sitiopos}\t{mutacao}\t{pepref}\t{pepmut}\n")

                                if sitiopos == 0 and alt == "Ter":
                                    sitiopos = 1  
                                    pepmutado = pepmutado[1:]
                                    DBRELACAO.write(f">{id_}\t{snp}\t{sitiopos}\t{mutacao}\t{pepref}\t{pepmut}\n")

           # Grava o último ID e sequência concatenada
            if prev_id:
                DBFINAL.write(f">{prev_id}\n{concat_peptideo}\n")

    except Exception as e:
        raise Exception(f"Erro ao processar mutações: {str(e)}")