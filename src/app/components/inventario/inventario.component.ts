import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService } from '../../services/inventario.service';
import { Producto } from '../../models/producto';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  inventario: Producto[] = [];
  itemSeleccionado: Producto | null = null;
  modoEdicion = false;
  
  nuevoItem: Omit<Producto, 'id'> = {
    nombre: '',
    precio: 0,
    imagen: 'assets/',
    stock: 10 // Stock por defecto
  };
  
  archivoXML: File | null = null;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private inventarioService: InventarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inventarioService.getInventario().subscribe(inventario => {
      this.inventario = inventario;
    });
  }

  agregarItem(): void {
    if (!this.validarFormulario(this.nuevoItem)) return;
    
    this.inventarioService.agregarItem(this.nuevoItem);
    this.mostrarExito('Producto agregado al catálogo correctamente');
    this.resetearFormulario();
  }

  editarItem(item: Producto): void {
    this.itemSeleccionado = { ...item };
    this.modoEdicion = true;
  }

  actualizarItem(): void {
    if (!this.itemSeleccionado) return;
    
    if (!this.validarFormulario(this.itemSeleccionado)) return;
    
    if (this.inventarioService.actualizarItem(this.itemSeleccionado)) {
      this.mostrarExito('Producto actualizado correctamente');
      this.cancelarEdicion();
    } else {
      this.mostrarError('Error al actualizar el producto');
    }
  }

  eliminarItem(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto del catálogo?')) {
      if (this.inventarioService.eliminarItem(id)) {
        this.mostrarExito('Producto eliminado correctamente');
        if (this.itemSeleccionado?.id === id) {
          this.cancelarEdicion();
        }
      } else {
        this.mostrarError('Error al eliminar el producto');
      }
    }
  }

  cancelarEdicion(): void {
    this.itemSeleccionado = null;
    this.modoEdicion = false;
  }

  resetearFormulario(): void {
    this.nuevoItem = {
      nombre: '',
      precio: 0,
      imagen: 'assets/',
      stock: 10
    };
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoXML = input.files[0];
      // Mostrar nombre del archivo seleccionado
      this.mostrarExito(`Archivo seleccionado: ${this.archivoXML.name}`);
    }
  }

  importarXML(): void {
    if (!this.archivoXML) {
      this.mostrarError('Por favor seleccione un archivo XML');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const contenido = e.target?.result as string;
      if (this.inventarioService.importarDesdeXML(contenido)) {
        this.mostrarExito('Catálogo de productos importado correctamente');
        this.archivoXML = null;
        // Limpiar el input file
        const fileInput = document.querySelector('#xmlFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        this.mostrarError('Error al importar el archivo XML');
      }
    };
    reader.readAsText(this.archivoXML);
  }

  exportarXML(): void {
    this.inventarioService.descargarXML();
    this.mostrarExito('XML del catálogo generado correctamente');
  }
  
  resetearInventario(): void {
    if (confirm('¿Estás seguro de que deseas restablecer el inventario al original? Se perderán todos los cambios.')) {
      this.inventarioService.resetearInventario();
      this.mostrarExito('El inventario ha sido restablecido al estado original');
    }
  }
  
  irAProductos(): void {
    this.router.navigate(['/productos']);
  }

  validarFormulario(item: any): boolean {
    if (!item.nombre || item.nombre.trim() === '') {
      this.mostrarError('El nombre del producto es obligatorio');
      return false;
    }
    
    if (item.precio <= 0) {
      this.mostrarError('El precio debe ser mayor que cero');
      return false;
    }
    
    if (!item.imagen || item.imagen.trim() === '') {
      this.mostrarError('La ruta de imagen es obligatoria');
      return false;
    }

    if (item.stock < 0) {
      this.mostrarError('El stock no puede ser negativo');
      return false;
    }
    
    return true;
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mensajeError = '';
    setTimeout(() => this.mensajeExito = '', 5000);
  }

  private mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mensajeExito = '';
    setTimeout(() => this.mensajeError = '', 5000);
  }

  getFormValue(field: string): any {
    if (this.modoEdicion && this.itemSeleccionado) {
      return this.itemSeleccionado[field as keyof Producto];
    } else {
      return this.nuevoItem[field as keyof Omit<Producto, 'id'>];
    }
  }
  
  setFormValue(field: string, value: any): void {
    if (this.modoEdicion && this.itemSeleccionado) {
      (this.itemSeleccionado as any)[field] = value;
    } else {
      (this.nuevoItem as any)[field] = value;
    }
  }
}