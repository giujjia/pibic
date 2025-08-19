from django.urls import path
from . import views

app_name = 'table_app'

urlpatterns = [
    # Main table viewer page
    path('', views.table_viewer, name='table_viewer'),
    
    # Data upload and processing endpoints
    path('upload-data/', views.upload_data, name='upload_data'),
    path('load-example/', views.load_example_data, name='load_example_data'),
    
    # Filter operations
    path('add-genes/', views.add_genes, name='add_genes'),
    path('add-protein-id/', views.add_protein_id, name='add_protein_id'),
    path('remove-contaminants/', views.remove_contaminants, name='remove_contaminants'),
    
    # Data export
    path('download/', views.download_data, name='download_data'),
]
