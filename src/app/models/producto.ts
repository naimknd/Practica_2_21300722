export interface Producto {
    id: number;
    nombre: string;
    precio: number;
    imagen: string;
    stock: number;     // Cantidad disponible en inventario
    cantidad?: number; // Para uso en el carrito (opcional)
  }