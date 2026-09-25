import { Smartphone } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Page } from '@/shared/ui/Page';

/** A reset link opened on a computer: it's meant for the phone with the app. */
export function ResetPasswordScreen() {
  return (
    <Page width="reading" title="Open on your phone">
      <EmptyState
        as="h1"
        icon={Smartphone}
        title="Open this on your phone"
        body="This link opens in the Yasante app. Open the email on the phone where you use Yasante and tap the link there, and you’ll go straight to choosing a new password. Links work for an hour; if this one has run out, ask for a new one from the sign-in screen in the app."
      />
    </Page>
  );
}
