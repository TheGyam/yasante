import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Package, Tag } from 'lucide-react-native';
import { errorMessage } from '@/features/auth';
import { CATEGORY_LABELS, useCreateProduct, type ProductCategory } from '@/features/shelf';
import { haptics } from '@/shared/lib/haptics';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { notify } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/Input';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProductCategory[];

const useStyles = makeStyles(() => ({
  body: { gap: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { paddingTop: space.md, gap: space.sm },
}));

/**
 * A product the catalogue doesn't have yet, added in a few words. It's on their shelf at
 * once; a moderator checks it before everyone else can find it. `name` and `barcode`
 * come along from a search or a scan that found nothing.
 */
export default function NewProductScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; barcode?: string }>();
  const create = useCreateProduct();
  const [brand, setBrand] = useState('');
  const [name, setName] = useState(params.name ?? '');
  const [category, setCategory] = useState<ProductCategory>();
  const [errors, setErrors] = useState<{ brand?: string; name?: string; category?: string }>({});

  const save = async () => {
    const found = {
      brand: brand.trim() ? undefined : 'Add the brand, like Cantu or Mielle',
      name: name.trim() ? undefined : 'Add the product’s name',
      category: category ? undefined : 'Pick what kind of product it is',
    };
    setErrors(found);
    if (found.brand || found.name || found.category) {
      haptics.error();
      return;
    }
    try {
      const product = await create.mutateAsync({
        brand: brand.trim(),
        name: name.trim(),
        category: category!,
        barcode: params.barcode || undefined,
      });
      haptics.success();
      router.back();
      await notify({
        title: 'On your shelf',
        message: product.pending
          ? 'Thanks for adding it. We’ll check it over, then everyone can find it too.'
          : 'It was already in the catalogue, so we’ve put that one on your shelf.',
      });
    } catch (error) {
      haptics.error();
      await notify({
        title: 'Couldn’t add it',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    }
  };

  return (
    <Screen
      title="Add a product"
      subtitle="Can’t find it? Tell us what it is and it goes straight on your shelf."
      modal
      keyboard
      testID="new-product-screen"
    >
      <View style={styles.body}>
        <Input
          label="Brand"
          icon={Tag}
          value={brand}
          onChangeText={text => {
            setBrand(text);
            if (errors.brand) setErrors(e => ({ ...e, brand: undefined }));
          }}
          placeholder="Cantu"
          autoCapitalize="words"
          error={errors.brand}
          autoFocus
          testID="product-brand"
        />
        <Input
          label="Product name"
          icon={Package}
          value={name}
          onChangeText={text => {
            setName(text);
            if (errors.name) setErrors(e => ({ ...e, name: undefined }));
          }}
          placeholder="Shea Butter Leave-In Conditioning Cream"
          autoCapitalize="words"
          error={errors.name}
          testID="product-name"
        />
        <View>
          <Text variant="footnote" tone="secondary" style={{ marginBottom: space.sm }}>
            What kind of product is it?
          </Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <Chip
                key={c}
                label={CATEGORY_LABELS[c]}
                selected={category === c}
                onPress={() => {
                  setCategory(c);
                  if (errors.category) setErrors(e => ({ ...e, category: undefined }));
                }}
              />
            ))}
          </View>
          {errors.category ? (
            <Text variant="footnote" tone="danger" style={{ marginTop: space.sm }}>
              {errors.category}
            </Text>
          ) : null}
        </View>
        {params.barcode ? (
          <Text variant="footnote" tone="tertiary">
            We’ll keep the barcode you scanned with it, so the next scan finds it straight away.
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Button
            label="Add to my shelf"
            onPress={save}
            loading={create.isPending}
            fullWidth
            testID="product-save"
          />
        </View>
      </View>
    </Screen>
  );
}
