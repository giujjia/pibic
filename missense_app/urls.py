from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='missense'),
    path('download/<str:file_type>/', views.download_file, name='download_file'),
]
