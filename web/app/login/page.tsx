import Image from 'next/image';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-full flex-col overflow-x-hidden md:h-dvh md:flex-row">
      <div className="relative hidden h-full md:block md:w-1/2">
        <Image
          src="/juridico-bg.jpg"
          alt="Pasillo de un tribunal"
          fill
          className="object-cover grayscale contrast-125"
          priority
        />
        <img
          src="/juridico-logo-blanco.png"
          alt="Jurídico"
          width={875}
          height={251}
          className="absolute bottom-10 left-1/2 w-72 -translate-x-1/2"
        />
      </div>
      <div className="flex min-h-dvh w-full min-w-0 max-w-full items-center justify-center overflow-x-hidden bg-white px-4 py-8 md:min-h-0 md:w-1/2 md:p-8">
        <div className="w-full min-w-0 max-w-md">
          <img src="/juridico-logo.png" alt="Jurídico" width={875} height={251} className="mx-auto mb-6 w-full max-w-sm" />
          <h1 className="mb-2 break-words text-2xl font-bold uppercase text-black sm:text-3xl">
            Bienvenido a Jurídico
          </h1>
          <p className="mb-2 text-gray-600">
            Inicia sesión con tus credenciales. Desde aquí se administran los despachos.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
