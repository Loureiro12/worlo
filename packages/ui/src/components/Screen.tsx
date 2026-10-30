import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/ThemeProvider';

export type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Leave false when the screen owns a FlatList. */
  scroll?: boolean;
  edges?: Edge[];
  testID?: string;
};

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  content: { flexGrow: 1, padding: t.space.lg, gap: t.space.lg },
}));

export function Screen({ children, scroll = false, edges = ['bottom'], testID }: ScreenProps) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.root} edges={edges} testID={testID}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
