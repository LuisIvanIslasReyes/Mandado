import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import type { Tables, TablesInsert, TablesUpdate } from './database.types';
import { TipoMovimiento, aplicarMovimiento, diasHasta } from './formato';
import { Hoy } from './hoy';
import { SupabaseService } from './supabase.service';

const COLUMNAS_PRODUCTO =
  'id, nombre, marca, cantidad, minimo, unidad, caduca_el, categoria_id, ubicacion_id' as const;

export type Producto = Pick<
  Tables<'productos'>,
  | 'id'
  | 'nombre'
  | 'marca'
  | 'cantidad'
  | 'minimo'
  | 'unidad'
  | 'caduca_el'
  | 'categoria_id'
  | 'ubicacion_id'
>;
export type Catalogo = Pick<Tables<'categorias'>, 'id' | 'nombre'>;
export type Movimiento = Pick<
  Tables<'movimientos'>,
  'id' | 'tipo' | 'cantidad' | 'precio' | 'nota' | 'usuario_id' | 'created_at'
>;
/** Lo que se captura en el formulario (sin cantidad: esa solo cambia con movimientos). */
export type DatosProducto = Pick<
  TablesInsert<'productos'>,
  'nombre' | 'marca' | 'categoria_id' | 'ubicacion_id' | 'unidad' | 'minimo' | 'caduca_el'
>;

/**
 * Inventario compartido por toda la app: productos activos, catálogos y
 * nombres de la familia. Se mantiene al día en tiempo real, así que si
 * alguien más registra algo en otro celular, aquí se ve solo.
 *
 * Los métodos que guardan devuelven un mensaje de error o `null`.
 */
@Injectable({ providedIn: 'root' })
export class InventarioStore {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);
  private readonly reloj = inject(Hoy);

  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Catalogo[]>([]);
  readonly ubicaciones = signal<Catalogo[]>([]);
  private readonly perfiles = signal<ReadonlyMap<string, string>>(new Map());
  readonly estado = signal<'inicial' | 'cargando' | 'listo' | 'error'>('inicial');

  readonly nombreCategoria = computed(() => mapaNombres(this.categorias()));
  readonly nombreUbicacion = computed(() => mapaNombres(this.ubicaciones()));

  /**
   * Lo que hay que comprar porque ya llegó a su mínimo (igual que la vista
   * `lista_super`), ordenado por categoría para recorrer el súper por pasillos.
   */
  readonly porComprar = computed(() => {
    const categorias = this.nombreCategoria();
    const categoria = (p: Producto) => (p.categoria_id && categorias.get(p.categoria_id)) || null;
    return this.productos()
      .filter((p) => p.minimo > 0 && p.cantidad <= p.minimo)
      .sort((a, b) => {
        const ca = categoria(a);
        const cb = categoria(b);
        // Lo que no tiene categoría va al final.
        if (ca !== cb) return ca === null ? 1 : cb === null ? -1 : ca.localeCompare(cb, 'es');
        return a.nombre.localeCompare(b.nombre, 'es');
      });
  });

  /**
   * Lo que caduca en los próximos 7 días o ya caducó (y todavía hay), de lo
   * más urgente a lo menos. Se calcula con la fecha local del celular, no con
   * la de la base (que está en UTC y en México ya es "mañana" desde la tarde).
   */
  readonly porCaducar = computed(() => {
    const hoy = this.reloj.fecha();
    return this.productos()
      .filter((p) => p.caduca_el && p.cantidad > 0)
      .map((producto) => ({ producto, dias: diasHasta(producto.caduca_el!, hoy) }))
      .filter((x) => x.dias <= 7)
      .sort((a, b) => a.dias - b.dias || a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
  });

  /** Lo urgente: ya caducó o caduca en 3 días o menos. */
  readonly urgentesPorCaducar = computed(() => this.porCaducar().filter((x) => x.dias <= 3).length);

  private canal: RealtimeChannel | null = null;
  private recargaPendiente?: ReturnType<typeof setTimeout>;

  constructor() {
    // Al cerrar sesión se olvida todo, para que otra cuenta no vea datos viejos.
    effect(() => {
      if (!this.auth.usuario()) untracked(() => this.reiniciar());
    });
  }

  /** Carga todo la primera vez y se suscribe a cambios. Llamarlo de nuevo no repite nada. */
  async iniciar(): Promise<void> {
    const estado = this.estado();
    if (estado === 'listo' || estado === 'cargando') return;
    this.estado.set('cargando');
    const ok = await this.cargarTodo();
    this.estado.set(ok ? 'listo' : 'error');
    if (ok) this.suscribir();
  }

  nombrePersona(usuarioId: string | null): string {
    return (usuarioId && this.perfiles().get(usuarioId)) || 'Alguien';
  }

  async crear(datos: DatosProducto, cantidadInicial: number): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('productos')
      .insert(datos)
      .select('id')
      .single();
    if (error) return mensajeDeError(error);
    if (cantidadInicial > 0) {
      const errorInicial = await this.registrar(data.id, 'ajuste', cantidadInicial, {
        nota: 'Cantidad inicial',
      });
      if (errorInicial) return errorInicial;
    }
    await this.recargarProductos();
    return null;
  }

  async actualizar(id: number, datos: DatosProducto): Promise<string | null> {
    const { error } = await this.supabase.from('productos').update(datos).eq('id', id);
    if (error) return mensajeDeError(error);
    await this.recargarProductos();
    return null;
  }

  /** Lo saca del inventario sin borrar su historial. */
  async quitar(id: number): Promise<string | null> {
    const cambios: TablesUpdate<'productos'> = { activo: false };
    const { error } = await this.supabase.from('productos').update(cambios).eq('id', id);
    if (error) return mensajeDeError(error);
    this.productos.update((lista) => lista.filter((p) => p.id !== id));
    return null;
  }

  /**
   * Registra una compra, consumo, merma o ajuste. La cantidad en pantalla
   * cambia al instante; si el servidor falla, se regresa a como estaba.
   */
  async registrar(
    productoId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    extra: { precio?: number | null; nota?: string | null } = {},
  ): Promise<string | null> {
    const anterior = this.productos();
    this.productos.update((lista) =>
      lista.map((p) =>
        p.id === productoId ? { ...p, cantidad: aplicarMovimiento(p.cantidad, tipo, cantidad) } : p,
      ),
    );
    const { error } = await this.supabase.from('movimientos').insert({
      producto_id: productoId,
      tipo,
      cantidad,
      precio: extra.precio ?? null,
      nota: extra.nota || null,
    });
    if (error) {
      this.productos.set(anterior);
      return mensajeDeError(error);
    }
    this.programarRecarga();
    return null;
  }

  async movimientos(productoId: number, limite = 10): Promise<Movimiento[] | string> {
    const { data, error } = await this.supabase
      .from('movimientos')
      .select('id, tipo, cantidad, precio, nota, usuario_id, created_at')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false })
      .limit(limite);
    return error ? mensajeDeError(error) : data;
  }

  private async cargarTodo(): Promise<boolean> {
    const [productos, categorias, ubicaciones, perfiles] = await Promise.all([
      this.consultaProductos(),
      this.supabase.from('categorias').select('id, nombre').order('nombre'),
      this.supabase.from('ubicaciones').select('id, nombre').order('nombre'),
      this.supabase.from('perfiles').select('id, nombre'),
    ]);
    if (productos.error || categorias.error || ubicaciones.error || perfiles.error) return false;
    this.productos.set(productos.data);
    this.categorias.set(categorias.data);
    this.ubicaciones.set(ubicaciones.data);
    this.perfiles.set(new Map(perfiles.data.map((p) => [p.id, p.nombre])));
    return true;
  }

  private consultaProductos() {
    return this.supabase
      .from('productos')
      .select(COLUMNAS_PRODUCTO)
      .eq('activo', true)
      .order('nombre');
  }

  private async recargarProductos(): Promise<void> {
    const { data, error } = await this.consultaProductos();
    if (!error) this.productos.set(data);
  }

  /** Junta varios avisos seguidos (p. ej. tocar + tres veces) en una sola recarga. */
  private programarRecarga(): void {
    clearTimeout(this.recargaPendiente);
    this.recargaPendiente = setTimeout(() => void this.recargarProductos(), 300);
  }

  private suscribir(): void {
    this.canal = this.supabase
      .channel('inventario')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () =>
        this.programarRecarga(),
      )
      .subscribe();
  }

  private reiniciar(): void {
    if (this.canal) void this.supabase.removeChannel(this.canal);
    this.canal = null;
    clearTimeout(this.recargaPendiente);
    this.productos.set([]);
    this.categorias.set([]);
    this.ubicaciones.set([]);
    this.perfiles.set(new Map());
    this.estado.set('inicial');
  }
}

function mapaNombres(lista: Catalogo[]): ReadonlyMap<number, string> {
  return new Map(lista.map((c) => [c.id, c.nombre]));
}

/** Traduce errores de la base de datos a mensajes para la familia. */
export function mensajeDeError(error: { code?: string; message?: string }): string {
  if (!error.code) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  if (error.code === '42501') return 'No tienes permiso para hacer esto.';
  if (error.code === '23505') return 'Ya existe un producto con ese código de barras.';
  return 'No se pudo guardar. Intenta de nuevo en un momento.';
}
