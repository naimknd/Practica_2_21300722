import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Producto } from '../models/producto';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  private productosUrl = 'assets/productos.xml';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.http.get(this.productosUrl, { responseType: 'text' })
      .pipe(
        map(xmlString => this.parsearXML(xmlString)),
        catchError(error => {
          console.error('Error cargando productos.xml:', error);
          return of([]);
        })
      )
      .subscribe(productos => {
        this.productosSubject.next(productos);
      });
  }

  parsearXML(xmlString: string): Producto[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const productos = Array.from(xmlDoc.getElementsByTagName('producto'));
    
    return productos.map((producto: Element) => ({
      id: parseInt(this.getElementText(producto, 'id') || '0', 10),
      nombre: this.getElementText(producto, 'nombre') || '',
      precio: parseFloat(this.getElementText(producto, 'precio') || '0'),
      imagen: this.getElementText(producto, 'imagen') || '',
      stock: parseInt(this.getElementText(producto, 'stock') || '10', 10), // Default stock 10
      cantidad: 1 // Para uso en el carrito
    }));
  }

  private getElementText(parent: Element, tagName: string): string | null {
    const elements = parent.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent : null;
  }

  getProductos(): Observable<Producto[]> {
    return this.productosSubject.asObservable();
  }
}