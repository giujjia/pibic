from django.core.management.base import BaseCommand
from django.conf import settings
import os
import shutil
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Limpa arquivos temporários gerados pelo processamento de peptídeos'
    
    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=1,help='Remover arquivos mais antigos que este número de dias')
    
    def handle(self, *args, **options):
        days = options['days']
        cut_off_date = datetime.now() - timedelta(days=days)
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
        
        if not os.path.exists(temp_dir):
            self.stdout.write(self.style.WARNING(f'Diretório {temp_dir} não encontrado'))
            return
        
        count = 0
        for item in os.listdir(temp_dir):
            item_path = os.path.join(temp_dir, item)
            
            if os.path.isdir(item_path):
                try:
                    mod_time = datetime.fromtimestamp(os.path.getmtime(item_path))
                    if mod_time < cut_off_date:
                        shutil.rmtree(item_path)
                        count += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Erro ao remover {item_path}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'Removidos {count} diretórios temporários mais antigos que {days} dias'))