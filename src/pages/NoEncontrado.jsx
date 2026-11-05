import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';

export default function NoEncontrado() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="display mt-10 text-[120px] text-rojo">404</p>
      <p className="text-lg text-ink-2">Esta página no existe o el link está mal escrito.</p>
      <Link to="/" className="btn-primary mt-8">Ir al inicio</Link>
    </div>
  );
}
