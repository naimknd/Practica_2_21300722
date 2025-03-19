import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Producto } from '../models/producto';
import { InventarioService } from './inventario.service';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private carrito: Producto[] = [];
  private readonly STORAGE_KEY = 'carrito';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private inventarioService: InventarioService
  ) {
    // Cargar carrito desde localStorage al iniciar
    if (isPlatformBrowser(this.platformId)) {
      const savedCarrito = localStorage.getItem(this.STORAGE_KEY);
      if (savedCarrito) {
        try {
          this.carrito = JSON.parse(savedCarrito);
        } catch (e) {
          console.error('Error al cargar carrito:', e);
        }
      }
    }
  }

  agregarProducto(producto: Producto): boolean {
    // Primero verificar disponibilidad en inventario
    if (this.inventarioService.actualizarStock(producto.id, -1)) {
      // Si hay stock, procedemos a agregar al carrito
      const index = this.carrito.findIndex(p => p.id === producto.id);
      if (index > -1) {
        this.carrito[index].cantidad!++;
      } else {
        // Hacemos una copia para no modificar el original
        const nuevoProd = { ...producto, cantidad: 1 };
        this.carrito.push(nuevoProd);
      }
      this.guardarEnLocal();
      return true;
    } else {
      console.error('No hay suficiente stock para ' + producto.nombre);
      return false;
    }
  }

  eliminarProducto(index: number): void {
    const producto = this.carrito[index];
    
    if (producto.cantidad! > 1) {
      producto.cantidad!--; // Reduce la cantidad
      this.inventarioService.actualizarStock(producto.id, 1); // Devuelve 1 al inventario
    } else {
      this.inventarioService.actualizarStock(producto.id, 1); // Devuelve 1 al inventario
      this.carrito.splice(index, 1); // Elimina el producto
    }
    
    this.guardarEnLocal();
  }

  vaciarCarrito(): void {
    // Devolver todos los productos al inventario
    this.carrito.forEach(producto => {
      this.inventarioService.actualizarStock(producto.id, producto.cantidad!);
    });
    
    this.carrito = [];
    this.guardarEnLocal();
  }

  getCarrito(): Producto[] {
    return this.carrito;
  }

  getTotal(): number {
    const total = this.carrito.reduce((total, producto) => 
      total + producto.precio * producto.cantidad!, 0);
    return Number(total.toFixed(2)); // Formatea a 2 decimales
  }

  getTotalConIVA(): number {
    const subtotal = this.getTotal();
    return Number((subtotal * 1.16).toFixed(2)); // Formatea a 2 decimales
  }

  getIVA(): number {
    const subtotal = this.getTotal();
    return Number((subtotal * 0.16).toFixed(2)); // Formatea a 2 decimales
  }

  private guardarEnLocal(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.carrito));
    }
  }

  generarXML(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }
    
    const fecha = new Date();
    const fechaFormateada = fecha.toISOString().split('T')[0];
    const hora = fecha.toTimeString().split(' ')[0];
    
    const iva = this.getIVA();
    const subtotal = this.getTotal();
    const total = this.getTotalConIVA();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="3.3" Fecha="${fechaFormateada}T${hora}" SubTotal="${subtotal.toFixed(2)}" Total="${total.toFixed(2)}" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Nombre="Tienda de Zapatos Online" Rfc="TSO180520AB1" RegimenFiscal="601"/>
  <cfdi:Receptor Nombre="PUBLICO EN GENERAL" Rfc="XAXX010101000" UsoCFDI="G01"/>
  <cfdi:Conceptos>`;
    
    this.carrito.forEach(producto => {
      const importe = producto.precio * producto.cantidad!;
      xml += `
    <cfdi:Concepto ClaveProdServ="53102500" Cantidad="${producto.cantidad}" ClaveUnidad="H87" Descripcion="${this.escapeXML(producto.nombre)}" ValorUnitario="${producto.precio.toFixed(2)}" Importe="${importe.toFixed(2)}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(importe * 0.16).toFixed(2)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    });
    
    xml += `
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
</cfdi:Comprobante>`;
    
    return xml;
  }
  
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

  descargarRecibo(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const xml = this.generarXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    
    const fecha = new Date();
    const nombreArchivo = `recibo-${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}.xml`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}