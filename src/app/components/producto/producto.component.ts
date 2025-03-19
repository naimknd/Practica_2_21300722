import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { InventarioService } from '../../services/inventario.service';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto.component.html',
  styleUrls: ['./producto.component.css']
})
export class ProductoComponent implements OnInit {
  productos: Producto[] = [];
  mensajeExito: string = '';
  mensajeError: string = '';
  
  constructor(
    private inventarioService: InventarioService,
    private carritoService: CarritoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.inventarioService.getInventario().subscribe(productos => {
      this.productos = productos;
    });
  }

  agregarAlCarrito(producto: Producto): void {
    if (this.carritoService.agregarProducto(producto)) {
      this.mostrarMensajeExito(producto.nombre);
    } else {
      this.mostrarMensajeError(`No hay suficiente stock de ${producto.nombre}`);
    }
  }

  irAlCarrito(): void {
    this.router.navigate(['/carrito']);
  }

  irAlInventario(): void {
    this.router.navigate(['/inventario']);
  }

  private mostrarMensajeExito(nombreProducto: string): void {
    this.mensajeExito = `${nombreProducto} agregado al carrito`;
    this.mensajeError = '';
    setTimeout(() => {
      this.mensajeExito = '';
    }, 3000);
  }
  
  private mostrarMensajeError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mensajeExito = '';
    setTimeout(() => {
      this.mensajeError = '';
    }, 3000);
  }
}