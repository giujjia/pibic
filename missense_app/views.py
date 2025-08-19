from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import tempfile
import json
from .peptide_processor import process_peptide_data

# Create your views here.

def index(request):
    context = {}
    
    if request.method == 'POST':
        try:
            input_type = request.POST.get('input_type', 'text')
            
            if input_type == 'text':
                peptide_text = request.POST.get('peptide_text', '')
                if not peptide_text.strip():
                    context['error'] = "The peptide text cannot be empty."
                else:
                    try:
                        results, session_data = process_peptide_data(peptide_text, 'text')
                        context['results'] = results
                        
                        # Save file paths in session for later download
                        request.session['peptide_files'] = session_data
                        
                        # Add success message for better UX
                        context['success'] = "Peptide data processed successfully!"
                        
                    except ValueError as ve:
                        context['error'] = f"Invalid input format: {str(ve)}"
                    except FileNotFoundError as fe:
                        context['error'] = f"Required reference file not found: {str(fe)}"
                    except Exception as e:
                        context['error'] = f"Processing error: {str(e)}"
                    
            elif input_type == 'file':
                peptide_file = request.FILES.get('peptide_file')
                if not peptide_file:
                    context['error'] = "No file was uploaded."
                else:
                    # Validate file type
                    allowed_extensions = ['.txt', '.fasta', '.csv', '.tsv']
                    file_extension = os.path.splitext(peptide_file.name)[1].lower()
                    
                    if file_extension not in allowed_extensions:
                        context['error'] = f"Invalid file type. Please upload a file with one of these extensions: {', '.join(allowed_extensions)}"
                    else:
                        try:
                            results, session_data = process_peptide_data(peptide_file, 'file')
                            context['results'] = results
                            
                            # Save file paths in session for later download
                            request.session['peptide_files'] = session_data
                            
                            # Add success message for better UX
                            context['success'] = f"File '{peptide_file.name}' processed successfully!"
                            
                        except ValueError as ve:
                            context['error'] = f"Invalid file content: {str(ve)}"
                        except FileNotFoundError as fe:
                            context['error'] = f"Required reference file not found: {str(fe)}"
                        except Exception as e:
                            context['error'] = f"File processing error: {str(e)}"
                    
        except Exception as e:
            context['error'] = f"Unexpected error: {str(e)}"
    
    return render(request, 'missense.html', context)

def download_file(request, file_type):
    """
    Allow downloading one of the generated files (dbpepmutref, dbsaida, dbfinal)
    """
    try:
        # Get file paths from session
        peptide_files = request.session.get('peptide_files', {})
        
        if not peptide_files:
            return HttpResponse("No files available for download. Process data first.", status=404)
        
        file_path = peptide_files.get(f'{file_type}_path')
        if not file_path or not os.path.exists(file_path):
            return HttpResponse(f"File {file_type} not found.", status=404)
        
        # Return file as download response
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='text/plain')
            response['Content-Disposition'] = f'attachment; filename="{file_type}.txt"'
            return response
            
    except Exception as e:
        return HttpResponse(f"Error downloading file: {str(e)}", status=500)
