import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent {
  reciboGenerado: boolean = false;
  receiptContent: string = '';

  constructor(
    private carritoService: CarritoService,
    private router: Router
  ) {}

  get carrito(): Producto[] {
    return this.carritoService.getCarrito();
  }

  get total(): number {
    return this.carritoService.getTotal();
  }

  get iva(): number {
    return this.carritoService.getIVA();
  }

  get totalConIVA(): number {
    return this.carritoService.getTotalConIVA();
  }

  eliminarProducto(index: number): void {
    this.carritoService.eliminarProducto(index);
    this.resetearRecibo();
  }

  generarRecibo(): void {
    this.receiptContent = this.carritoService.generarXML();
    this.reciboGenerado = true;
  }

  descargarRecibo(): void {
    this.carritoService.descargarRecibo();
  }

  resetearRecibo(): void {
    this.reciboGenerado = false;
    this.receiptContent = '';
  }

  vaciarCarrito(): void {
    if (confirm('¿Estás seguro que deseas vaciar el carrito?')) {
      this.carritoService.vaciarCarrito();
      this.resetearRecibo();
    }
  }

  volverAProductos(): void {
    this.router.navigate(['/productos']);
  }

  hayProductos(): boolean {
    return this.carrito.length > 0;
  }
}