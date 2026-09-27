import { useParams } from 'react-router';
import { StylistScreen } from '@/features/stylist';
import NotFoundRoute from './not-found';

/** A handle: letters, numbers, dots and underscores, as the server allows. */
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9._]{1,49}$/;

export default function StylistRoute() {
  const { handle = '' } = useParams();
  if (!HANDLE.test(handle)) return <NotFoundRoute />;
  return <StylistScreen key={handle} handle={handle} />;
}
