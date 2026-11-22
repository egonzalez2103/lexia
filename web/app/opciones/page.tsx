const opciones = [
  { src: '/opciones/1-nombre.jpg', numero: '1', nombre: 'Nombre' },
  { src: '/opciones/2-monograma.jpg', numero: '2', nombre: 'Monograma' },
  { src: '/opciones/3-columna.jpg', numero: '3', nombre: 'Columna' },
  { src: '/opciones/4-balanza.jpg', numero: '4', nombre: 'Balanza' },
];

export default function OpcionesLogoPage() {
  return (
    <main className="min-h-dvh bg-white px-6 py-10 text-black">
      <h1 className="text-center text-2xl font-bold uppercase tracking-wide">Opciones de logo</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-neutral-600">
        Elige un número. La marca se queda en negro sobre blanco.
      </p>
      <div className="mx-auto mt-10 grid max-w-5xl gap-8 md:grid-cols-2">
        {opciones.map((opcion) => (
          <figure key={opcion.numero} className="border border-neutral-200">
            <img src={opcion.src} alt={opcion.nombre} className="aspect-square w-full bg-white object-contain" />
            <figcaption className="border-t border-neutral-200 px-4 py-3 text-sm">
              <span className="font-semibold">{opcion.numero}. {opcion.nombre}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
