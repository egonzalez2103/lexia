import Image from 'next/image';
import Link from 'next/link';

export default function RecuperarPage() {
  return (
    <div className="flex w-full max-w-full flex-col overflow-x-hidden md:h-dvh md:flex-row">
      <div className="relative hidden h-full md:block md:w-1/2">
        <Image src="/lexia-bg.jpg" alt="Pasillo de un tribunal" fill className="object-cover grayscale contrast-125" priority />
      </div>
      <div className="flex min-h-dvh w-full min-w-0 max-w-full items-center justify-center overflow-x-hidden bg-white px-4 py-8 md:min-h-0 md:w-1/2 md:p-8">
        <div className="w-full min-w-0 max-w-md">
          <img src="/lexia-logo.svg" alt="Lexia" width={400} height={120} className="mx-auto mb-6 w-full max-w-sm" />
          <h1 className="mb-2 text-3xl font-bold uppercase text-black">Recuperar contraseña</h1>
          <p className="mb-6 text-sm text-gray-600">
            El correo de recuperación todavía no está conectado. Si no puedes entrar, el dueño de la plataforma restablece el acceso.
          </p>
          <Link href="/login" className="text-sm font-medium text-black hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
