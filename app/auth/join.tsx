import { useState } from 'react';
import { useRouter } from '@/shared/lib/navigation';
import { Scissors, Sparkles } from 'lucide-react-native';
import { AuthLayout, AuthSwitch, RoleCard } from '@/features/auth';

type Role = 'client' | 'stylist';

// Long enough to see the card light up, short enough to feel like one motion.
const ADVANCE_AFTER = 260;

export default function JoinScreen() {
  const router = useRouter();
  const [picked, setPicked] = useState<Role | null>(null);

  const choose = (role: Role) => {
    setPicked(role);
    setTimeout(() => router.push({ pathname: '/auth/signup', params: { role } }), ADVANCE_AFTER);
  };

  return (
    <AuthLayout
      title="Join Yasante"
      subtitle="How will you use it? You can add the other side later."
      testID="join-screen"
      footer={
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign in"
          onPress={() => router.replace('/auth/login')}
        />
      }
    >
      <RoleCard
        icon={Sparkles}
        title="I’m here for my hair"
        body="Styles for your texture, care that fits, and stylists near you."
        selected={picked === 'client'}
        onPress={() => choose('client')}
        testID="role-client"
      />
      <RoleCard
        icon={Scissors}
        title="I’m a stylist"
        body="A page for your bio with your menu, prices and policies."
        selected={picked === 'stylist'}
        onPress={() => choose('stylist')}
        testID="role-stylist"
      />
    </AuthLayout>
  );
}
