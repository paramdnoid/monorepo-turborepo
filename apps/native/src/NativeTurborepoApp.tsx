/**
 * NativeWind + local `components/ui` — works offline; not the same source as `@repo/ui`.
 */
import '../global.css';

import {
  alertMessage,
  deployHref,
  description,
  docsHref,
  step1CodePath,
  step2Text,
  templatesHref,
  title,
  turborepoSiteHref,
} from '@repo/turborepo-starter';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import GlobeIcon from '../assets/globe.svg';
import VercelIcon from '../assets/vercel.svg';
import WindowIcon from '../assets/window.svg';
import { TurborepoLogo } from '../components/turborepo-logo';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Code } from '../components/ui/code';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';

export function NativeTurborepoApp() {
  return (
    <SafeAreaProvider>
      <View className={cn('dark flex-1 bg-background')}>
        <View className="flex min-h-full flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
          <View className="h-[38px] w-[180px] shrink-0 items-center justify-center">
            <TurborepoLogo />
          </View>

          <Card className="w-full max-w-lg border-border/80 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="gap-4 font-mono text-sm leading-6">
              <View className="gap-2">
                <Text className="text-left font-mono text-sm leading-6 text-muted-foreground">
                  1. Bearbeite{' '}
                  <Code className="text-foreground">{step1CodePath}</Code>
                </Text>
                <Text className="text-left font-mono text-sm leading-6 text-muted-foreground">
                  2. {step2Text}
                </Text>
              </View>
              <Separator />
              <View className="flex flex-col flex-wrap gap-3 sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  className="rounded-full"
                  onPress={() => {
                    Linking.openURL(deployHref).catch(() => {});
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="mr-2 invert">
                      <VercelIcon width={20} height={20} />
                    </View>
                    <Text className="text-sm font-medium text-primary-foreground">
                      Deploy now
                    </Text>
                  </View>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                  onPress={() => {
                    Linking.openURL(docsHref).catch(() => {});
                  }}
                >
                  Read our docs
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-full"
                  onPress={() => {
                    Alert.alert('', alertMessage);
                  }}
                >
                  Open alert
                </Button>
              </View>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-center gap-6">
              <Pressable
                className="flex-row items-center gap-2"
                onPress={() => {
                  Linking.openURL(templatesHref).catch(() => {});
                }}
              >
                <WindowIcon width={16} height={16} />
                <Text className="text-sm text-muted-foreground underline underline-offset-4">
                  Examples
                </Text>
              </Pressable>
              <Pressable
                className="flex-row items-center gap-2"
                onPress={() => {
                  Linking.openURL(turborepoSiteHref).catch(() => {});
                }}
              >
                <GlobeIcon width={16} height={16} />
                <Text className="text-sm text-muted-foreground underline underline-offset-4">
                  Go to turborepo.dev →
                </Text>
              </Pressable>
            </CardFooter>
          </Card>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
