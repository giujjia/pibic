import json
import os
import time
import pandas as pd
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from Bio import Entrez
import io

# Configure Entrez email
Entrez.email = "giujjia@gmail.com"

def table_viewer(request):
    """Renders the main table viewer page"""
    return render(request, 'table.html')

@csrf_exempt
@require_http_methods(["POST"])
def upload_data(request):
    """Handle file upload and return table data"""
    try:
        if 'data_file' not in request.FILES:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
        
        uploaded_file = request.FILES['data_file']
        
        # Save file temporarily
        file_path = default_storage.save(f'temp/{uploaded_file.name}', ContentFile(uploaded_file.read()))
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        try:
            # Load Excel file with all sheets
            sheets_data = pd.read_excel(full_path, sheet_name=None)
            
            # Validate required sheets
            required_sheets = ['Proteins', 'Peptides', 'Scans']
            for sheet in required_sheets:
                if sheet not in sheets_data:
                    return JsonResponse({'error': f'Missing required sheet: {sheet}'}, status=400)
            
            # Convert to JSON format
            result = {}
            for sheet_name, df in sheets_data.items():
                # Convert DataFrame to dict with proper handling of NaN values
                result[sheet_name.lower()] = {
                    'columns': df.columns.tolist(),
                    'data': df.fillna('').to_dict('records')
                }
            
            # Store in session for later use
            request.session['current_data'] = result
            
            return JsonResponse({
                'success': True,
                'data': result
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(full_path):
                os.remove(full_path)
                
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt 
@require_http_methods(["POST"])
def load_example_data(request):
    """Load example data from static file"""
    try:
        # Path to example file
        example_path = os.path.join(settings.STATIC_ROOT or settings.BASE_DIR, 'data', 'example_data.xlsx')
        
        if not os.path.exists(example_path):
            # Fallback to BASE_DIR/static structure
            example_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'example_data.xlsx')
        
        if not os.path.exists(example_path):
            return JsonResponse({'error': 'Example data file not found'}, status=404)
        
        # Load Excel file
        sheets_data = pd.read_excel(example_path, sheet_name=None)
        
        # Convert to JSON format
        result = {}
        for sheet_name, df in sheets_data.items():
            result[sheet_name.lower()] = {
                'columns': df.columns.tolist(), 
                'data': df.fillna('').to_dict('records')
            }
        
        # Store in session
        request.session['current_data'] = result
        
        return JsonResponse({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_gene_symbol_from_gi(gi_id, delay=0.34):
    """Get gene symbol from GI ID using Entrez"""
    try:
        handle = Entrez.elink(dbfrom="protein", db="gene", id=gi_id)
        record = Entrez.read(handle)
        handle.close()

        if not record[0]["LinkSetDb"]:
            return None
        gene_id = record[0]["LinkSetDb"][0]["Link"][0]["Id"]

        time.sleep(delay)
        handle = Entrez.efetch(db="gene", id=gene_id, rettype="xml")
        gene_record = Entrez.read(handle)
        handle.close()

        gene_info = gene_record[0]
        gene_symbol = gene_info["Entrezgene_gene"]["Gene-ref"]["Gene-ref_locus"]
        return gene_symbol

    except Exception as e:
        print(f"[WARN] Não foi possível obter gene para ID {gi_id}: {e}")
        return None

def locci_to_gene_symbols(protein_locci):
    """
    Recebe string 'TheProteinLocci' (pode conter vários IDs separados por '|')
    e retorna string com símbolos de genes separados por ', '.
    """
    if pd.isna(protein_locci) or not protein_locci:
        return "N/A"

    ids = [x.strip() for x in str(protein_locci).split('|') if x.strip()]
    genes = [get_gene_symbol_from_gi(_id) for _id in ids]
    genes = list(filter(None, genes))                    
    return ", ".join(genes) if genes else "N/A"

def obter_mapa_peptide_to_locci(df_peptides):
    """Obtém mapeamento de PeptideSequence para TheProteinLocci"""
    return (
        df_peptides[["PeptideSequence", "TheProteinLocci"]]
        .drop_duplicates()
        .set_index("PeptideSequence")["TheProteinLocci"]
    )

def adicionar_colunas_scans(df_scans, mapa_locci):
    """Adiciona colunas TheProteinLocci e Gene ao DataFrame de scans"""
    pos_seq = df_scans.columns.get_loc("PeptideSequence")

    locci_col = df_scans["PeptideSequence"].map(mapa_locci)
    df_scans.insert(pos_seq + 1, "TheProteinLocci", locci_col)

    gene_col = locci_col.apply(locci_to_gene_symbols)
    df_scans.insert(pos_seq + 2, "Gene", gene_col)

    return df_scans

def adicionar_apenas_gene_scans(df_scans, mapa_locci):
    """Adiciona apenas a coluna Gene ao DataFrame de scans (quando TheProteinLocci já existe)"""
    # Se TheProteinLocci já existe, usar ela diretamente
    if 'TheProteinLocci' in df_scans.columns:
        gene_col = df_scans['TheProteinLocci'].apply(locci_to_gene_symbols)
    else:
        # Se não existe, mapear primeiro
        locci_col = df_scans["PeptideSequence"].map(mapa_locci)
        gene_col = locci_col.apply(locci_to_gene_symbols)
    
    # Adicionar Gene como última coluna
    df_scans['Gene'] = gene_col
    return df_scans

@csrf_exempt
@require_http_methods(["POST"])
def add_genes(request):
    """Add gene information to selected sheets"""
    try:
        if 'current_data' not in request.session:
            return JsonResponse({'error': 'Nenhum dado disponível'}, status=400)
        
        # Parse request body to get selected sheets
        try:
            body = json.loads(request.body.decode('utf-8'))
            selected_sheets = body.get('sheets', [])
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato de requisição inválido'}, status=400)
        
        if not selected_sheets:
            return JsonResponse({'error': 'Nenhuma planilha selecionada'}, status=400)
        
        data = request.session['current_data'].copy()
        messages = []
        
        # Get peptides data for mapping if needed
        peptides_df = None
        mapa_locci = None
        if 'peptides' in data:
            peptides_df = pd.DataFrame(data['peptides']['data'])
            if 'PeptideSequence' in peptides_df.columns and 'TheProteinLocci' in peptides_df.columns:
                mapa_locci = obter_mapa_peptide_to_locci(peptides_df)
        
        for sheet_name in selected_sheets:
            if sheet_name not in data:
                continue
                
            df = pd.DataFrame(data[sheet_name]['data'])
            
            # Check if Gene column already exists
            if 'Gene' in df.columns:
                messages.append(f"Informações de genes já presentes em {sheet_name.title()}")
                continue
            
            if sheet_name == 'proteins':
                # For proteins, use Locus column directly
                if 'Locus' in df.columns:
                    # Add Gene column as last column
                    gene_col = df['Locus'].apply(locci_to_gene_symbols)
                    df['Gene'] = gene_col
                    
                    # Update the data
                    data['proteins'] = {
                        'columns': df.columns.tolist(),
                        'data': df.fillna('').to_dict('records')
                    }
                    
                    messages.append(f"Informações de genes adicionadas a {sheet_name.title()}")
                else:
                    messages.append(f"Não foi possível adicionar genes a {sheet_name.title()}: coluna Locus não encontrada")
                    
            elif sheet_name == 'peptides':
                # For peptides, use TheProteinLocci column
                if 'TheProteinLocci' in df.columns:
                    # Add Gene column as last column
                    gene_col = df['TheProteinLocci'].apply(locci_to_gene_symbols)
                    df['Gene'] = gene_col
                    
                    # Update the data
                    data['peptides'] = {
                        'columns': df.columns.tolist(),
                        'data': df.fillna('').to_dict('records')
                    }
                    
                    messages.append(f"Informações de genes adicionadas a {sheet_name.title()}")
                else:
                    messages.append(f"Não foi possível adicionar genes a {sheet_name.title()}: coluna TheProteinLocci não encontrada")
                    
            elif sheet_name == 'scans':
                # For scans, add only Gene column (not TheProteinLocci)
                if 'PeptideSequence' in df.columns and mapa_locci is not None:
                    # Use the new function that adds only Gene column
                    df_modified = adicionar_apenas_gene_scans(df.copy(), mapa_locci)
                    
                    # Update the data
                    data['scans'] = {
                        'columns': df_modified.columns.tolist(),
                        'data': df_modified.fillna('').to_dict('records')
                    }
                    
                    # Count lines with gene information
                    linhas_c_gene = df_modified["Gene"].ne("N/A").sum()
                    messages.append(f"Coluna 'Gene' adicionada em {linhas_c_gene} linhas de Scans")
                else:
                    if 'PeptideSequence' not in df.columns:
                        messages.append(f"Não foi possível adicionar genes a {sheet_name.title()}: coluna PeptideSequence não encontrada")
                    else:
                        messages.append(f"Não foi possível adicionar genes a {sheet_name.title()}: dados de peptídeos não disponíveis")
        
        # Save updated data
        request.session['current_data'] = data
        
        return JsonResponse({
            'success': True,
            'data': data,
            'message': '; '.join(messages) if messages else 'Nenhuma alteração feita'
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Erro ao adicionar genes: {str(e)}'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def add_protein_id(request):
    """Add protein identification from peptides to scans (as last column)"""
    try:
        if 'current_data' not in request.session:
            return JsonResponse({'error': 'Nenhum dado disponível'}, status=400)
        
        data = request.session['current_data'].copy()
        
        # Check if TheProteinLocci column already exists in scans
        scans_df = pd.DataFrame(data['scans']['data'])
        if 'TheProteinLocci' in scans_df.columns:
            return JsonResponse({
                'success': True,
                'data': data,
                'message': 'IDs de proteínas já estão presentes em Scans'
            })
        
        # Get peptides data to create mapping
        peptides_df = pd.DataFrame(data['peptides']['data'])
        
        # Create mapping from PeptideSequence to TheProteinLocci
        mapa_locci = obter_mapa_peptide_to_locci(peptides_df)
        
        # Add TheProteinLocci column as the last column
        scans_df['TheProteinLocci'] = scans_df["PeptideSequence"].map(mapa_locci)
        
        # Update the data
        data['scans'] = {
            'columns': scans_df.columns.tolist(),
            'data': scans_df.fillna('').to_dict('records')
        }
        
        # Save updated data
        request.session['current_data'] = data
        
        return JsonResponse({
            'success': True,
            'data': data,
            'message': 'IDs de proteínas adicionados a Scans'
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Erro ao adicionar IDs de proteínas: {str(e)}'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def remove_contaminants(request):
    """Remove contaminants from selected sheets"""
    try:
        if 'current_data' not in request.session:
            return JsonResponse({'error': 'Nenhum dado disponível'}, status=400)
        
        # Parse request body to get selected sheets
        try:
            body = json.loads(request.body.decode('utf-8'))
            selected_sheets = body.get('sheets', [])
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Formato de requisição inválido'}, status=400)
        
        if not selected_sheets:
            return JsonResponse({'error': 'Nenhuma planilha selecionada'}, status=400)
        
        data = request.session['current_data'].copy()
        total_removed = {'proteins': 0, 'peptides': 0, 'scans': 0}
        contaminant_peptides = set()
        
        # First pass: collect contaminant peptides from peptides sheet if selected
        if 'peptides' in selected_sheets and 'peptides' in data:
            peptides_df = pd.DataFrame(data['peptides']['data'])
            if 'TheProteinLocci' in peptides_df.columns:
                mask = peptides_df["TheProteinLocci"].str.contains("contaminant", case=False, na=False)
                peptides_excluded = peptides_df[mask]
                if 'PeptideSequence' in peptides_excluded.columns:
                    contaminant_peptides.update(peptides_excluded["PeptideSequence"].unique())
        
        # Process each selected sheet
        for sheet_name in selected_sheets:
            if sheet_name not in data:
                continue
                
            df = pd.DataFrame(data[sheet_name]['data'])
            original_count = len(df)
            
            if sheet_name == 'proteins':
                # Remove contaminants from proteins based on Locus column
                if 'Locus' in df.columns:
                    mask = df["Locus"].str.contains("contaminant", case=False, na=False)
                    df_filtered = df[~mask]
                    total_removed['proteins'] = original_count - len(df_filtered)
                    
                    data['proteins'] = {
                        'columns': df_filtered.columns.tolist(),
                        'data': df_filtered.fillna('').to_dict('records')
                    }
                    
            elif sheet_name == 'peptides':
                # Remove contaminants from peptides based on TheProteinLocci column
                if 'TheProteinLocci' in df.columns:
                    mask = df["TheProteinLocci"].str.contains("contaminant", case=False, na=False)
                    df_filtered = df[~mask]
                    total_removed['peptides'] = original_count - len(df_filtered)
                    
                    data['peptides'] = {
                        'columns': df_filtered.columns.tolist(),
                        'data': df_filtered.fillna('').to_dict('records')
                    }
                    
            elif sheet_name == 'scans':
                # Remove scans based on contaminant peptides
                if 'PeptideSequence' in df.columns:
                    # If peptides sheet wasn't processed, get contaminant peptides from it
                    if not contaminant_peptides and 'peptides' in data:
                        peptides_df = pd.DataFrame(data['peptides']['data'])
                        if 'TheProteinLocci' in peptides_df.columns:
                            peptides_mask = peptides_df["TheProteinLocci"].str.contains("contaminant", case=False, na=False)
                            contaminant_peptides.update(peptides_df[peptides_mask]["PeptideSequence"].unique())
                    
                    if contaminant_peptides:
                        scan_mask = df["PeptideSequence"].isin(contaminant_peptides)
                        df_filtered = df[~scan_mask]
                        total_removed['scans'] = original_count - len(df_filtered)
                        
                        data['scans'] = {
                            'columns': df_filtered.columns.tolist(),
                            'data': df_filtered.fillna('').to_dict('records')
                        }
        
        # Create summary message
        messages = []
        for sheet, count in total_removed.items():
            if count > 0:
                messages.append(f"{count} linhas de {sheet.title()}")
        
        if not messages:
            message = "Nenhum contaminante encontrado nas planilhas selecionadas"
        else:
            message = f"Removidos {', '.join(messages)}"
        
        # Save updated data
        request.session['current_data'] = data
        
        return JsonResponse({
            'success': True,
            'data': data,
            'message': message
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Erro ao remover contaminantes: {str(e)}'}, status=500)

@require_http_methods(["GET"])
def download_data(request):
    """Download current data as Excel file"""
    try:
        if 'current_data' not in request.session:
            return JsonResponse({'error': 'Nenhum dado disponível'}, status=400)
        
        data = request.session['current_data']
        
        # Create Excel file in memory
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for sheet_name, sheet_data in data.items():
                df = pd.DataFrame(sheet_data['data'])
                df.to_excel(writer, sheet_name=sheet_name.title(), index=False)
        
        output.seek(0)
        
        # Create response with timestamp in filename
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="filtered_data_{timestamp}.xlsx"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
