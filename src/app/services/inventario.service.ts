import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Producto } from '../models/producto';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private inventarioSubject = new BehaviorSubject<Producto[]>([]);
  private productosXmlUrl = 'assets/productos.xml';
  private STORAGE_KEY = 'productos_catalogo';
  private nextId = 1;
  private xmlCargado = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.inicializarInventario();
  }

  // Inicializa el inventario desde localStorage o XML
  private inicializarInventario(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Intentar cargar desde localStorage primero
    const localData = localStorage.getItem(this.STORAGE_KEY);
    
    if (localData) {
      try {
        const productos = JSON.parse(localData);
        if (productos.length > 0) {
          this.nextId = Math.max(...productos.map((item: any) => item.id)) + 1;
          this.inventarioSubject.next(productos);
          console.log('Inventario cargado desde localStorage');
        } else {
          this.cargarProductosDesdeXML();
        }
      } catch (e) {
        console.error('Error al parsear datos locales:', e);
        this.cargarProductosDesdeXML();
      }
    } else {
      this.cargarProductosDesdeXML();
    }
  }

  // Cargar productos desde XML
  private cargarProductosDesdeXML(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    console.log('Cargando productos desde XML...');
    this.http.get(this.productosXmlUrl, { responseType: 'text' })
      .pipe(
        map(xmlString => this.parsearXML(xmlString)),
        catchError(error => {
          console.error('Error cargando productos.xml:', error);
          return of([]);
        }),
        tap(() => this.xmlCargado = true)
      )
      .subscribe(productos => {
        if (productos.length > 0) {
          this.nextId = Math.max(...productos.map(item => item.id)) + 1;
        }
        
        this.inventarioSubject.next(productos);
        this.guardarEnLocal();
        console.log('Productos cargados desde XML y guardados en localStorage');
      });
  }

  // Parsear XML a objetos de producto
  private parsearXML(xmlString: string): Producto[] {
    if (!isPlatformBrowser(this.platformId)) return [];

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const productos = Array.from(xmlDoc.getElementsByTagName('producto'));
      
      return productos.map((producto: Element) => ({
        id: parseInt(this.getElementText(producto, 'id') || '0', 10),
        nombre: this.getElementText(producto, 'nombre') || '',
        precio: parseFloat(this.getElementText(producto, 'precio') || '0'),
        imagen: this.getElementText(producto, 'imagen') || '',
        stock: parseInt(this.getElementText(producto, 'stock') || '10', 10), // Default stock 10
        cantidad: 1
      }));
    } catch (error) {
      console.error('Error al parsear XML:', error);
      return [];
    }
  }
  
  // Helper para obtener texto de elemento XML con manejo de nulos
  private getElementText(parent: Element, tagName: string): string | null {
    const elements = parent.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : null;
  }

  // Obtener observable del inventario para suscribirse a cambios
  getInventario(): Observable<Producto[]> {
    // Si no se ha cargado ningún dato y estamos en el navegador, intentar inicializar
    if (!this.xmlCargado && isPlatformBrowser(this.platformId) && this.inventarioSubject.value.length === 0) {
      this.inicializarInventario();
    }
    return this.inventarioSubject.asObservable();
  }

  // Obtener el valor actual del inventario sin observable
  getInventarioActual(): Producto[] {
    return this.inventarioSubject.value;
  }

  // Agregar un nuevo item al inventario
  agregarItem(item: Omit<Producto, 'id'>): Producto {
    const nuevoItem: Producto = {
      ...item,
      id: this.nextId++
    };

    const items = [...this.inventarioSubject.value, nuevoItem];
    this.inventarioSubject.next(items);
    this.guardarEnLocal();
    return nuevoItem;
  }

  // Eliminar un item del inventario
  eliminarItem(id: number): boolean {
    const items = this.inventarioSubject.value;
    const indice = items.findIndex(item => item.id === id);
    if (indice !== -1) {
      items.splice(indice, 1);
      this.inventarioSubject.next([...items]);
      this.guardarEnLocal();
      return true;
    }
    return false;
  }

  // Obtener un item específico por ID
  obtenerItem(id: number): Producto | undefined {
    return this.inventarioSubject.value.find(item => item.id === id);
  }

  // Actualizar un item existente
  actualizarItem(item: Producto): boolean {
    const items = this.inventarioSubject.value;
    const indice = items.findIndex(i => i.id === item.id);
    if (indice !== -1) {
      items[indice] = item;
      this.inventarioSubject.next([...items]);
      this.guardarEnLocal();
      return true;
    }
    return false;
  }

  // Actualizar el stock de un producto
  actualizarStock(id: number, cambio: number): boolean {
    const items = this.inventarioSubject.value;
    const indice = items.findIndex(i => i.id === id);
    
    if (indice !== -1) {
      // Si el cambio es negativo, verificamos que haya suficiente stock
      if (cambio < 0 && items[indice].stock + cambio < 0) {
        return false; // No hay suficiente stock
      }
      
      // Actualizamos el stock (sumando o restando)
      items[indice].stock += cambio;
      
      this.inventarioSubject.next([...items]);
      this.guardarEnLocal();
      return true;
    }
    return false;
  }

  // Guardar en localStorage
  private guardarEnLocal(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inventarioSubject.value));
    }
  }

  // Generar XML actualizado del catálogo completo
  generarXML(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    const items = this.inventarioSubject.value;
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<productos>\n';
    
    items.forEach(item => {
      xml += '    <producto>\n';
      xml += `        <id>${item.id}</id>\n`;
      xml += `        <nombre>${this.escapeXML(item.nombre)}</nombre>\n`;
      xml += `        <precio>${item.precio}</precio>\n`;
      xml += `        <imagen>${this.escapeXML(item.imagen)}</imagen>\n`;
      xml += `        <stock>${item.stock}</stock>\n`;
      xml += '    </producto>\n';
    });
    
    xml += '</productos>';
    return xml;
  }
  
  // Escape XML special characters
  private escapeXML(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // Exportar XML como archivo descargable
  descargarXML(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const xml = this.generarXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('XML exportado correctamente');
  }

  // Importar datos desde XML
  importarDesdeXML(xmlString: string): boolean {
    try {
      const productos = this.parsearXML(xmlString);
      if (productos.length > 0) {
        // Actualizar el ID más alto
        this.nextId = Math.max(...productos.map(item => item.id)) + 1;
        this.inventarioSubject.next(productos);
        this.guardarEnLocal();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al importar XML:', error);
      return false;
    }
  }
  
  // Recargar desde el XML original (reset)
  resetearInventario(): void {
    this.cargarProductosDesdeXML();
  }
}