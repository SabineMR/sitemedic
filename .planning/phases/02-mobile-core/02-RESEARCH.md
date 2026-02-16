# Phase 2: Mobile Core - Research

**Researched:** 2026-02-15
**Domain:** Offline-first mobile data capture with gloves-on usability for construction site health & safety
**Confidence:** HIGH

## Summary

Phase 2 focuses on building offline-first mobile workflows for construction medics to capture treatments, worker profiles, near-misses, and daily safety checks with gloves-on usability. Research confirms that Expo SDK 54 provides a mature ecosystem for offline mobile forms with photo handling, signature capture, and on-device image compression. The critical domains are: auto-saving form state with WatermelonDB's reactive observables, gloves-on UI design (48x48pt minimum tap targets per iOS/Android guidelines), on-device photo compression with expo-image-manipulator (resize to 1200px, JPEG compress 0.6-0.8), signature capture with react-native-signature-canvas (WebView-based, generates base64 PNG), and construction HSE workflow patterns (preset templates for speed, photo-first near-miss reporting, Green/Amber/Red daily checklists).

Key findings: WatermelonDB's withObservables HOC provides automatic UI re-rendering on field changes enabling zero-config auto-save, iOS requires 44x44pt minimum tap targets while Android requires 48x48pt (use 48x48pt for cross-platform), expo-image-picker supports multiple photo selection with `selectionLimit` parameter (limit to 4 per requirement TREAT-06), construction safety apps in 2026 emphasize photo-first workflows with real-time alerts and offline capability as table stakes, and HSE UK RIDDOR specified injuries provide the foundation for injury taxonomy but must be supplemented with minor injury categories for first-aid treatment logging.

**Primary recommendation:** Use WatermelonDB's reactive observables (withObservables HOC) for auto-save by binding form components directly to database records—no manual save logic needed, changes persist immediately. Design all primary actions with 56x56pt tap targets (exceeds both iOS/Android minimums, optimized for gloves). Use expo-image-picker with selectionLimit=4 + expo-image-manipulator for on-device compression (resize to 1200px, JPEG compress 0.7). For signature capture, use react-native-signature-canvas (pure JS, no native deps, works with Expo managed workflow). Structure workflows as preset template cards for speed (e.g., "Minor Cut" preset auto-fills injury type + common treatments), use bottom sheet modals for secondary actions to increase touch target size, and implement Green/Amber/Red status pattern for daily checklists (industry standard, requires optional photo + note per item).

## Standard Stack

The established libraries/tools for offline-first mobile data capture with gloves-on usability:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | Latest (Expo SDK 54) | Photo/camera access with multiple selection | Official Expo module, supports camera + library, `allowsMultipleSelection` with `selectionLimit`, quality control 0-1, works on iOS/Android/Web |
| expo-image-manipulator | Latest (Expo SDK 54) | On-device image resize and compression | Official Expo module, resize with auto aspect ratio, compress 0-1 range, JPEG/PNG/WebP formats, synchronous processing |
| react-native-signature-canvas | 4.x+ | Signature capture with smooth canvas drawing | Pure JavaScript WebView-based canvas, no native dependencies, works with Expo managed workflow, generates base64 PNG, smooth drawing experience on iOS/Android |
| WatermelonDB | 0.28.0+ (from Phase 1) | Reactive offline database with auto-save | withObservables HOC auto-updates UI on record changes, lazy loading for instant app launch, built for React Native performance |
| @gorhom/react-native-bottom-sheet | 5.x | Bottom sheet modals with large touch targets | Most popular RN bottom sheet library (11k+ stars), smooth gestures, snap points, accessibility support, modal + inline modes, larger header touch targets improve glove usability |
| react-hook-form | 7.x | Form state management and validation | Web + React Native support, Controller wrapper for RN inputs, works offline (client-side validation), integrates with Zod/Yup for schema validation, minimal re-renders for performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-image-picker-multiple | Latest | Extended photo picker with granular limit control | Use if need more control than expo-image-picker's selectionLimit (e.g., custom UI, max property for strict limits); wraps expo-image-picker with ImageBrowser component |
| @markerjs/react-native-markerjs | Latest | Photo annotation (arrows, circles, text) | For photo markup feature (TREAT-06 implies annotation capability), supports arrows/circles/text, linkware license (free with attribution), actively maintained |
| expo-speech-recognition | Latest | Voice-to-text dictation for near-miss descriptions | Optional enhancement for NEAR-04 (voice-to-text), implements iOS SFSpeechRecognizer + Android SpeechRecognizer, works offline with on-device recognition, dictation hints for medical terminology |
| react-native-autocomplete-dropdown | Latest | Fast worker search with typeahead | Pure JS, TypeScript support, iOS/Android, fully customizable styling, flexible data handling, optimized for performance with debouncing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-signature-canvas | expo-pixi (Sketch component) | expo-pixi offers native canvas but adds complexity and larger bundle size; signature-canvas is simpler WebView wrapper, proven stable |
| expo-image-manipulator | expo-image-and-video-compressor | Newer library (SDK 51+) with video support, but expo-image-manipulator is official and battle-tested |
| react-hook-form | Formik | Formik is more opinionated, heavier bundle; react-hook-form has better performance (fewer re-renders), official React Native support |
| @gorhom/bottom-sheet | Custom modal | Bottom sheet increases touch target size through headers/handles, better UX than standard modal for mobile, worth the dependency |

**Installation:**
```bash
# Core photo/signature dependencies
npx expo install expo-image-picker expo-image-manipulator
npm install react-native-signature-canvas react-native-webview

# Form and UI dependencies
npm install react-hook-form @gorhom/react-native-bottom-sheet
npx expo install react-native-reanimated react-native-gesture-handler

# Optional enhancements
npm install react-native-autocomplete-dropdown
npm install @markerjs/react-native-markerjs  # For photo annotation
npm install expo-speech-recognition  # For voice-to-text (requires config plugin)

# Configure app.json for expo-speech-recognition (if using)
# Add to plugins: ["expo-speech-recognition"]
```

## Architecture Patterns

### Recommended Project Structure
```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx              # Dashboard/Home (daily check prompt, quick actions)
│   │   ├── treatments.tsx         # Treatment log list view
│   │   ├── workers.tsx            # Worker registry
│   │   └── safety.tsx             # Near-misses + Daily checks
│   ├── treatment/
│   │   ├── new.tsx                # New treatment workflow
│   │   ├── [id].tsx               # View/edit treatment
│   │   └── templates.tsx          # Preset template picker (quick-entry mode)
│   ├── worker/
│   │   ├── new.tsx                # Add worker (induction flow)
│   │   ├── [id].tsx               # Worker profile + history
│   │   └── quick-add.tsx          # Inline quick-add (minimal fields)
│   └── safety/
│       ├── near-miss.tsx          # Near-miss capture workflow
│       └── daily-check.tsx        # Daily safety checklist
├── components/
│   ├── forms/
│   │   ├── AutoSaveForm.tsx       # WatermelonDB-bound form wrapper
│   │   ├── WorkerSearchPicker.tsx # Autocomplete search with quick-add inline
│   │   ├── BodyDiagramPicker.tsx  # Tap-to-select body part diagram
│   │   ├── PhotoCapture.tsx       # Multi-photo picker with compression
│   │   ├── SignaturePad.tsx       # Full-screen signature canvas
│   │   └── PresetTemplateCard.tsx # Quick-entry preset buttons (48x48pt min)
│   ├── safety/
│   │   ├── DailyChecklistItem.tsx # Green/Amber/Red + photo + note
│   │   └── NearMissQuickCapture.tsx # Photo-first near-miss flow
│   └── ui/
│       ├── LargeTapButton.tsx     # 56x56pt tap target (gloves-on)
│       ├── BottomSheetPicker.tsx  # Bottom sheet for pickers (large targets)
│       └── StatusBadge.tsx        # Green/Amber/Red visual indicators
├── services/
│   ├── photo-processor.ts         # Image compression pipeline
│   ├── auto-save-manager.ts       # Auto-save debouncing (10s interval from req)
│   └── taxonomy/
│       ├── injury-types.ts        # RIDDOR + minor injury categories
│       ├── body-parts.ts          # Body part taxonomy (OIICS-based)
│       ├── treatment-types.ts     # First aid treatment categories
│       └── near-miss-categories.ts # Construction hazard types
└── database/
    └── models/                    # WatermelonDB models (from Phase 1)
        ├── Treatment.ts
        ├── Worker.ts
        ├── NearMiss.ts
        └── SafetyCheck.ts
```

### Pattern 1: Auto-Save Form with WatermelonDB Reactive Observables
**What:** Bind form components directly to WatermelonDB records using withObservables HOC. Record updates trigger automatic UI re-renders and database persistence. No manual save button needed—every field change persists immediately.
**When to use:** ALL treatment logging, near-miss capture, daily checks, and worker profile forms. Satisfies TREAT-10 requirement (auto-save every 10 seconds) and eliminates data loss risk.
**Example:**
```typescript
// components/forms/AutoSaveForm.tsx
import { withObservables } from '@nozbe/watermelondb/react'
import { Treatment } from '@/database/models/Treatment'
import { useController, useForm } from 'react-hook-form'
import { useEffect } from 'react'

// Component receives WatermelonDB record as prop
function TreatmentFormInner({ treatment }: { treatment: Treatment }) {
  const { control, watch } = useForm({
    defaultValues: {
      injuryType: treatment.injuryType,
      bodyPart: treatment.bodyPart,
      treatmentNotes: treatment.treatmentNotes,
    }
  })

  // Watch all fields for changes
  const formValues = watch()

  // Auto-save on field change (debounced 500ms to avoid excessive writes)
  useEffect(() => {
    const timer = setTimeout(async () => {
      await treatment.update(record => {
        record.injuryType = formValues.injuryType
        record.bodyPart = formValues.bodyPart
        record.treatmentNotes = formValues.treatmentNotes
      })
    }, 500) // Debounce 500ms

    return () => clearTimeout(timer)
  }, [formValues, treatment])

  return (
    <View>
      <Controller
        control={control}
        name="injuryType"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Injury type"
          />
        )}
      />
      {/* Other fields... */}
    </View>
  )
}

// HOC binds component to live database record
const enhance = withObservables(['treatmentId'], ({ treatmentId }) => ({
  treatment: database.get('treatments').findAndObserve(treatmentId),
}))

export const TreatmentForm = enhance(TreatmentFormInner)
```
**Source:** [WatermelonDB withObservables guide](https://github.com/Nozbe/WatermelonDB), [Offline app with WatermelonDB tutorial](https://blog.logrocket.com/offline-app-react-native-watermelondb/)

### Pattern 2: Gloves-On Large Tap Targets
**What:** Design all interactive elements with minimum 48x48pt tap targets (iOS/Android standard), ideally 56x56pt for primary actions. Use bottom sheet modals to increase effective touch area through large headers/handles. Apply ample spacing (8-10px minimum) between adjacent tap targets.
**When to use:** MANDATORY for all workflows per UX-01 requirement. Construction workers wear thick gloves, making small touch targets unusable.
**Example:**
```typescript
// components/ui/LargeTapButton.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

export function LargeTapButton({
  onPress,
  label,
  variant = 'primary'
}: {
  onPress: () => void
  label: string
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
      // Extend touch area beyond visual bounds if needed
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56, // Exceeds iOS 44pt + Android 48pt minimum
    minWidth: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8, // 8px spacing between elements (accessibility minimum)
  },
  primary: {
    backgroundColor: '#2563EB', // High contrast blue
  },
  secondary: {
    backgroundColor: '#E5E7EB',
  },
  pressed: {
    opacity: 0.8, // Visual feedback for press
  },
  label: {
    fontSize: 18, // Large, readable font
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
```
**Source:** [React Native accessibility guidelines](https://reactnative.dev/docs/accessibility), [Mobile accessibility tap target sizes](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/)

### Pattern 3: Photo Capture with On-Device Compression
**What:** Use expo-image-picker for multi-photo selection (limit to 4 per TREAT-06), immediately compress with expo-image-manipulator (resize to 1200px, JPEG compress 0.7), store compressed URI in WatermelonDB. Original photo never stored—compression happens in capture pipeline.
**When to use:** Treatment photos (TREAT-06), near-miss photos (NEAR-03), daily check photos (DAILY-02). Satisfies PHOTO-02 requirement (compress to 100-200KB).
**Example:**
```typescript
// services/photo-processor.ts
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

export async function captureAndCompressPhotos(limit: number = 4): Promise<string[]> {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Camera permission denied')
  }

  // Pick multiple photos with limit
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit, // Expo SDK 50+ supports selectionLimit
    quality: 1.0, // Don't pre-compress in picker, do it in next step
  })

  if (result.canceled) return []

  // Compress each photo on-device
  const compressedUris = await Promise.all(
    result.assets.map(async (asset) => {
      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          { resize: { width: 1200 } }, // Auto-maintains aspect ratio
        ],
        {
          compress: 0.7, // JPEG quality 70% (balances quality vs size)
          format: ImageManipulator.SaveFormat.JPEG, // JPEG for photos (smaller than PNG)
        }
      )
      return manipResult.uri
    })
  )

  return compressedUris
}

// Usage in component:
async function handleAddPhotos() {
  const photoUris = await captureAndCompressPhotos(4)

  // Store in WatermelonDB record
  await treatment.update(record => {
    record.photoUris = JSON.stringify([...existingPhotos, ...photoUris])
  })
}
```
**Source:** [Expo ImagePicker documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Expo ImageManipulator documentation](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

### Pattern 4: Signature Capture with Full-Screen Canvas
**What:** Use react-native-signature-canvas with full-screen modal for large drawing area. Thick pen stroke (3-4px) for glove-friendly signing. Generate base64 PNG on signature end, store in WatermelonDB.
**When to use:** Treatment signature (TREAT-08), worker consent signature (GDPR-03). Satisfies gloves-on requirement (large signature pad area from CONTEXT.md decision).
**Example:**
```typescript
// components/forms/SignaturePad.tsx
import SignatureCanvas from 'react-native-signature-canvas'
import { Modal, View, StyleSheet, Button } from 'react-native'
import { useState } from 'react'

export function SignaturePad({
  onSave,
  visible,
  onClose
}: {
  onSave: (base64: string) => void
  visible: boolean
  onClose: () => void
}) {
  const [signature, setSignature] = useState<string | null>(null)

  const handleOK = (sig: string) => {
    setSignature(sig)
    onSave(sig) // Save base64 PNG to database
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <SignatureCanvas
          onOK={handleOK}
          onEmpty={() => console.log('Signature cleared')}
          descriptionText="Sign with your finger"
          clearText="Clear"
          confirmText="Save"
          webStyle={`.m-signature-pad--footer { display: flex; justify-content: space-between; }
                     .m-signature-pad { box-shadow: none; border: none; }
                     .m-signature-pad--body { border: 2px solid #E5E7EB; }
                     canvas { background-color: white; }
                     button {
                       padding: 16px 32px;
                       font-size: 18px;
                       min-height: 56px; /* Large tap target */
                       border-radius: 8px;
                       background-color: #2563EB;
                       color: white;
                       border: none;
                       font-weight: 600;
                     }`}
          penColor="#000000"
          dotSize={3} // Thick stroke for glove-friendly signing
          minWidth={3}
          maxWidth={4}
        />
        <Button title="Cancel" onPress={onClose} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
})
```
**Source:** [react-native-signature-canvas npm](https://www.npmjs.com/package/react-native-signature-canvas), [How to capture signature in Expo guide](https://medium.com/@patick.cyiza/how-to-capture-a-signature-in-expo-react-native-99d5e0366df6)

### Pattern 5: Preset Templates for Quick Entry
**What:** Display common injury types as large tappable cards (e.g., "Minor Cut", "Bruise", "Headache"). Tapping preset auto-fills injury type + common treatments + body part suggestions. User can override or add details. Targets <30 second completion for TREAT-11.
**When to use:** Treatment quick-entry mode, daily check common issues. Construction sites have recurring minor injuries—presets eliminate typing.
**Example:**
```typescript
// app/treatment/templates.tsx
import { LargeTapButton } from '@/components/ui/LargeTapButton'
import { router } from 'expo-router'

const PRESET_TEMPLATES = [
  {
    id: 'minor-cut',
    label: 'Minor Cut',
    icon: '🩹',
    defaults: {
      injuryType: 'Laceration (minor)',
      treatment: 'Cleaned wound, applied antiseptic, adhesive dressing',
      bodyPart: 'Hand',
      outcome: 'Returned to work',
    }
  },
  {
    id: 'bruise',
    label: 'Bruise',
    icon: '💢',
    defaults: {
      injuryType: 'Contusion',
      treatment: 'Ice pack applied, monitored',
      bodyPart: 'Arm',
      outcome: 'Returned to work',
    }
  },
  {
    id: 'headache',
    label: 'Headache',
    icon: '🤕',
    defaults: {
      injuryType: 'Headache',
      treatment: 'Rest in welfare area, water provided',
      bodyPart: 'Head',
      outcome: 'Returned to work',
    }
  },
  // More presets...
]

export default function TemplatePickerScreen() {
  const handleSelectTemplate = async (template: typeof PRESET_TEMPLATES[0]) => {
    // Create new treatment record with preset defaults
    const treatment = await database.get('treatments').create(record => {
      record.injuryType = template.defaults.injuryType
      record.treatment = template.defaults.treatment
      record.bodyPart = template.defaults.bodyPart
      record.outcome = template.defaults.outcome
      record.createdAt = Date.now()
    })

    // Navigate to treatment form for review/adjustment
    router.push(`/treatment/${treatment.id}`)
  }

  return (
    <View style={styles.grid}>
      {PRESET_TEMPLATES.map(template => (
        <LargeTapButton
          key={template.id}
          label={`${template.icon} ${template.label}`}
          onPress={() => handleSelectTemplate(template)}
        />
      ))}
    </View>
  )
}
```

### Pattern 6: Worker Search with Inline Quick-Add
**What:** Search-first autocomplete that filters workers by name/company/role as user types. If worker not found, inline "Quick Add" button appears in search results. Quick-add captures minimal fields (name, company) to unblock treatment logging, full profile captured later.
**When to use:** Worker selection in treatment workflow (TREAT-01), near-miss reporter selection. Satisfies CONTEXT.md decision (search-first with smart filtering, quick-add inline).
**Example:**
```typescript
// components/forms/WorkerSearchPicker.tsx
import { AutocompleteDropdown } from 'react-native-autocomplete-dropdown'
import { useState } from 'react'
import { database } from '@/lib/watermelon'
import { Q } from '@nozbe/watermelondb'

export function WorkerSearchPicker({ onSelect }: { onSelect: (workerId: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [workers, setWorkers] = useState<Worker[]>([])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    // Search by name, company, or role simultaneously
    const results = await database.get('workers').query(
      Q.or(
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(query)}%`)),
        Q.where('company', Q.like(`%${Q.sanitizeLikeString(query)}%`)),
        Q.where('role', Q.like(`%${Q.sanitizeLikeString(query)}%`)),
      )
    ).fetch()

    setWorkers(results)
  }

  const handleQuickAdd = async () => {
    // Create minimal worker record
    const worker = await database.get('workers').create(record => {
      record.name = searchQuery
      record.company = 'Unknown' // Prompt for company next
      record.createdAt = Date.now()
      record.isIncomplete = true // Flag for follow-up
    })

    onSelect(worker.id)
  }

  return (
    <View>
      <AutocompleteDropdown
        dataSet={workers.map(w => ({
          id: w.id,
          title: `${w.name} - ${w.company}`,
        }))}
        onChangeText={handleSearch}
        onSelectItem={(item) => item && onSelect(item.id)}
        textInputProps={{
          placeholder: 'Search worker by name, company, or role',
          style: { fontSize: 18, minHeight: 56 }, // Large tap target
        }}
      />

      {/* Show quick-add if no results and query is not empty */}
      {searchQuery.length > 0 && workers.length === 0 && (
        <LargeTapButton
          label={`+ Quick Add "${searchQuery}"`}
          onPress={handleQuickAdd}
          variant="secondary"
        />
      )}
    </View>
  )
}
```

### Pattern 7: Green/Amber/Red Daily Checklist
**What:** Each checklist item displays Green/Amber/Red status buttons (large tap targets), optional photo attachment, optional note. Industry standard for construction safety checklists. Visual status indicators (traffic light colors) provide at-a-glance compliance.
**When to use:** Daily safety checks (DAILY-01, DAILY-02). Satisfies CONTEXT.md discretion area (research industry best practices for daily checklist patterns).
**Example:**
```typescript
// components/safety/DailyChecklistItem.tsx
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { useState } from 'react'

type Status = 'green' | 'amber' | 'red' | null

export function DailyChecklistItem({
  label,
  onStatusChange,
}: {
  label: string
  onStatusChange: (status: Status, photo?: string, note?: string) => void
}) {
  const [status, setStatus] = useState<Status>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const handleStatusPress = (newStatus: Status) => {
    setStatus(newStatus)
    onStatusChange(newStatus, photoUri, note)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.statusButtons}>
        <Pressable
          style={[styles.statusButton, styles.green, status === 'green' && styles.selected]}
          onPress={() => handleStatusPress('green')}
        >
          <Text style={styles.statusText}>✓ OK</Text>
        </Pressable>

        <Pressable
          style={[styles.statusButton, styles.amber, status === 'amber' && styles.selected]}
          onPress={() => handleStatusPress('amber')}
        >
          <Text style={styles.statusText}>⚠ Issue</Text>
        </Pressable>

        <Pressable
          style={[styles.statusButton, styles.red, status === 'red' && styles.selected]}
          onPress={() => handleStatusPress('red')}
        >
          <Text style={styles.statusText}>✕ Fail</Text>
        </Pressable>
      </View>

      {/* Photo + note appear after status selected */}
      {status && (
        <View style={styles.details}>
          <LargeTapButton
            label="Add Photo"
            onPress={async () => {
              const [uri] = await captureAndCompressPhotos(1)
              setPhotoUri(uri)
              onStatusChange(status, uri, note)
            }}
            variant="secondary"
          />

          <TextInput
            placeholder="Add note (optional)"
            value={note}
            onChangeText={(text) => {
              setNote(text)
              onStatusChange(status, photoUri, text)
            }}
            style={styles.noteInput}
            multiline
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minHeight: 56, // Large tap target
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
  },
  green: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  amber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  red: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  selected: {
    borderWidth: 4, // Thicker border for selected state
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  details: {
    marginTop: 12,
    gap: 8,
  },
  noteInput: {
    minHeight: 80,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 16,
  },
})
```
**Source:** [Construction safety checklist best practices](https://www.xenia.team/articles/best-construction-safety-inspection-software), [Mobile form design patterns](https://www.interaction-design.org/literature/article/ui-form-design)

### Anti-Patterns to Avoid
- **Small text inputs (<48pt height):** Construction workers with gloves cannot tap accurately—use 56pt minimum for all inputs
- **Manual save buttons:** WatermelonDB's reactive observables enable auto-save—no save button needed, eliminates data loss
- **Picker wheels for selection:** Difficult with gloves—use large button grids or bottom sheet lists instead
- **Complex multi-step wizards:** Each screen transition adds time—use single-screen forms with collapsible sections for speed
- **Inline photo preview thumbnails:** Small thumbnails are hard to tap—use full-width photo cards with large tap area for removal
- **Light grey text on white:** Unreadable in bright sunlight (UX-02)—use high contrast colors (minimum WCAG AA 4.5:1 ratio)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature capture canvas | Custom Canvas/SVG drawing | react-native-signature-canvas | WebView-based canvas handles touch events smoothly across iOS/Android, generates base64 PNG, battle-tested library (4k+ stars), no native dependencies |
| Image compression | Custom resize/compress logic | expo-image-manipulator | Official Expo module handles aspect ratio calculation, format conversion, platform-specific optimizations, synchronous processing |
| Bottom sheet modal | Custom animated modal | @gorhom/react-native-bottom-sheet | Smooth gesture handling, snap points, keyboard avoidance, accessibility support, backdrop handling—11k+ stars, industry standard |
| Form validation | Manual field validation | react-hook-form + Zod | Schema-based validation, type-safe, works offline, minimal re-renders, 40k+ stars, built for performance |
| Autocomplete search | Custom filtered FlatList | react-native-autocomplete-dropdown | Debouncing, keyboard handling, styling, focus management, accessibility—fully customizable |
| Photo annotation (arrows/circles) | Custom drawing on image | @markerjs/react-native-markerjs | Arrow/circle/text tools, touch handling, layer management, undo/redo, export to base64—free linkware license |

**Key insight:** Mobile form libraries are battle-tested for accessibility, performance, and edge cases (keyboard avoidance, orientation changes, platform differences). Gloves-on usability requires large touch targets and smooth gesture handling—these libraries solve it, custom solutions miss edge cases.

## Common Pitfalls

### Pitfall 1: iOS GIF Compression Destroys Animations
**What goes wrong:** Expo ImagePicker compresses animated GIFs to static images unless quality is explicitly 1.0 AND allowsEditing is false. Medics capture photos of injuries that appear to be static but are actually animated—compression fails silently.
**Why it happens:** iOS image picker applies compression by default. Expo SDK 50+ changed compression behavior for GIFs.
**How to avoid:** Always set quality: 1.0 and allowsEditing: false when using ImagePicker, then apply compression in separate step with ImageManipulator. This gives full control over compression pipeline.
**Warning signs:** User reports "photo looks different after saving", file size is smaller than expected, animated content appears static.

### Pitfall 2: WatermelonDB Record Updates Outside withObservables Don't Re-Render
**What goes wrong:** Form component doesn't use withObservables HOC, updates record manually with treatment.update(), UI doesn't reflect changes until screen refresh. User enters data, navigates away, data appears lost.
**Why it happens:** WatermelonDB observables only trigger re-renders if component is subscribed via withObservables. Manual updates don't notify React components.
**How to avoid:** ALWAYS wrap form components with withObservables HOC to subscribe to record changes. For one-off updates (e.g., button press), use prepareUpdate() pattern and ensure component is subscribed to the record.
**Warning signs:** Data saves to database but UI doesn't update, screen requires manual refresh to show changes, auto-save appears broken.

### Pitfall 3: expo-image-picker selectionLimit Not Supported Pre-SDK 50
**What goes wrong:** Code uses selectionLimit parameter, works on SDK 50+ but crashes or ignores limit on older SDK versions. User can select unlimited photos, breaking storage limits and UI design.
**Why it happens:** selectionLimit was added in Expo SDK 50. Older SDKs silently ignore the parameter or throw errors.
**How to avoid:** Verify Expo SDK version is 50+ in package.json. For SDK <50, use expo-image-picker-multiple library which provides max property for selection limits.
**Warning signs:** selectionLimit parameter has no effect, user can select more photos than intended, TypeScript doesn't show selectionLimit in autocomplete for older SDK versions.

### Pitfall 4: Signature Canvas WebView Doesn't Load in Development Mode
**What goes wrong:** react-native-signature-canvas displays blank white screen in Expo Go or development build. Works in production build but fails in dev, blocking testing.
**Why it happens:** WebView security policies in development mode block inline HTML/JS. react-native-signature-canvas uses inline HTML canvas rendered in WebView.
**How to avoid:** Test signature component in production build or use Expo Dev Client (custom development build) which relaxes WebView restrictions. Alternatively, use expo-pixi for native canvas (no WebView dependency).
**Warning signs:** Blank white screen when SignatureCanvas renders, console shows WebView security errors, component works in production but not development.

### Pitfall 5: Bottom Sheet Modal Keyboard Pushes Content Off-Screen
**What goes wrong:** User taps TextInput in bottom sheet, keyboard appears, input field is pushed off-screen and invisible. User can't see what they're typing.
**Why it happens:** Bottom sheet calculates snap points before keyboard appears. When keyboard opens, content is pushed up but snap points don't recalculate, hiding input.
**How to avoid:** Use @gorhom/react-native-bottom-sheet's keyboardBehavior="interactive" and keyboardBlurBehavior="restore" props. Wrap inputs in BottomSheetScrollView instead of ScrollView. Install react-native-keyboard-controller for advanced keyboard handling.
**Warning signs:** TextInput hidden by keyboard in bottom sheet, user must close keyboard to see input field, bottom sheet doesn't resize when keyboard opens.

### Pitfall 6: Photo Compression Doesn't Achieve 100-200KB Target
**What goes wrong:** Photos compressed with compress: 0.7 still exceed 500KB-1MB, failing PHOTO-02 requirement (100-200KB). Storage fills up quickly, sync takes too long.
**Why it happens:** compress parameter is JPEG quality, not target file size. High-resolution photos (4K+) remain large even at 0.7 quality. Resize dimension matters more than compression.
**How to avoid:** ALWAYS resize to 1200px width first, THEN compress. Adjust resize dimension based on file size—if still too large, reduce to 800px or 600px. Test compression pipeline with real device photos (12MP+), not simulator images.
**Warning signs:** Compressed photos exceed 200KB, storage fills quickly, image quality is high but file size is large, sync times are slow.

### Pitfall 7: Workers Search Doesn't Handle Special Characters or Accents
**What goes wrong:** Worker named "José García" cannot be found when searching "Jose Garcia" (without accents). Worker named "O'Brien" breaks search query with apostrophe. Search appears broken.
**Why it happens:** WatermelonDB Q.like() uses SQL LIKE which is case-sensitive and accent-sensitive. Special characters like apostrophes must be escaped. Most search implementations don't normalize input.
**How to avoid:** Use Q.sanitizeLikeString() to escape special characters. Normalize search query by removing accents (use normalize('NFD').replace(/[\u0300-\u036f]/g, '')) and converting to lowercase. Store normalized version of name in separate column for search.
**Warning signs:** Workers with accents or special characters cannot be found, search breaks with apostrophes or quotes, case-sensitive search requires exact match.

## Code Examples

Verified patterns from official sources:

### Photo Capture with Limit and Compression Pipeline
```typescript
// Full pipeline: Pick → Compress → Store
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

async function capturePhotosForTreatment(treatmentId: string) {
  // 1. Pick up to 4 photos from library (TREAT-06)
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 4, // SDK 50+ only
    quality: 1.0, // Don't pre-compress
    allowsEditing: false, // Preserve GIFs if needed
  })

  if (result.canceled) return

  // 2. Compress each photo on-device (PHOTO-02: 100-200KB target)
  const compressedUris = await Promise.all(
    result.assets.map(async (asset) => {
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }], // Auto aspect ratio
        {
          compress: 0.7, // JPEG quality 70%
          format: ImageManipulator.SaveFormat.JPEG,
        }
      )
      return compressed.uri
    })
  )

  // 3. Store compressed URIs in WatermelonDB (TREAT-10: auto-save)
  const treatment = await database.get('treatments').find(treatmentId)
  await treatment.update(record => {
    const existing = JSON.parse(record.photoUris || '[]')
    record.photoUris = JSON.stringify([...existing, ...compressedUris])
  })
}
```
**Source:** [Expo ImagePicker docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Expo ImageManipulator docs](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

### WatermelonDB Auto-Save with Debouncing
```typescript
// Auto-save form changes every 500ms (TREAT-10: auto-save every 10s)
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Treatment } from '@/database/models/Treatment'

function TreatmentForm({ treatment }: { treatment: Treatment }) {
  const { watch } = useForm({
    defaultValues: {
      injuryType: treatment.injuryType,
      treatment: treatment.treatment,
    }
  })

  const formValues = watch()

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      await treatment.update(record => {
        record.injuryType = formValues.injuryType
        record.treatment = formValues.treatment
        record.lastModifiedAt = Date.now() // For sync conflict resolution
      })
    }, 500) // Debounce 500ms (balance between responsiveness and performance)

    return () => clearTimeout(timer)
  }, [formValues, treatment])

  // Form renders...
}
```
**Source:** [WatermelonDB React integration guide](https://github.com/Nozbe/WatermelonDB)

### Worker Search with Fuzzy Matching
```typescript
// Search by name, company, or role with accent normalization
import { database } from '@/lib/watermelon'
import { Q } from '@nozbe/watermelondb'

function normalizeString(str: string): string {
  return str
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
    .trim()
}

async function searchWorkers(query: string) {
  const normalized = normalizeString(query)

  // Search across multiple fields simultaneously
  const workers = await database.get('workers').query(
    Q.or(
      Q.where('name_normalized', Q.like(`%${Q.sanitizeLikeString(normalized)}%`)),
      Q.where('company_normalized', Q.like(`%${Q.sanitizeLikeString(normalized)}%`)),
      Q.where('role_normalized', Q.like(`%${Q.sanitizeLikeString(normalized)}%`)),
    ),
    Q.sortBy('name', Q.asc)
  ).fetch()

  return workers
}

// Note: Add name_normalized, company_normalized, role_normalized columns to schema
// Populate on record creation/update
```
**Source:** [WatermelonDB query guide](https://github.com/Nozbe/WatermelonDB)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual save buttons in forms | Auto-save with reactive observables (WatermelonDB withObservables) | 2022+ (WatermelonDB maturity) | Zero data loss, eliminates "Did I save?" anxiety, better offline UX |
| Single photo picker then compress | Multi-photo selection with selectionLimit (Expo SDK 50+) | Expo SDK 50 (2024) | Faster workflow, single picker call for multiple photos, built-in limit enforcement |
| Custom signature canvas | WebView-based signature libraries (react-native-signature-canvas) | 2020+ | Smooth touch handling, cross-platform consistency, no native module complexity |
| 44pt minimum tap targets (iOS HIG) | 48pt minimum (Android Material) → 56pt recommended for accessibility | 2023+ (WCAG 2.2) | Better gloves-on usability, aligns iOS/Android standards, accessibility compliance |
| ImagePicker quality parameter for compression | Separate ImageManipulator step for resize + compress | Expo SDK 45+ | More control over compression pipeline, consistent results across platforms, prevents iOS GIF bug |
| Formik for form state | react-hook-form | 2021+ | Better performance (fewer re-renders), smaller bundle, TypeScript support, React Native official support |
| Manual bottom sheet implementation | @gorhom/react-native-bottom-sheet library | 2021+ | Gesture handling, keyboard avoidance, snap points, accessibility—industry standard |

**Deprecated/outdated:**
- **expo-image-picker MediaTypeOptions enum:** Deprecated in SDK 50+, use string array ['images', 'videos'] instead
- **Manual AsyncStorage for form persistence:** Replaced by WatermelonDB reactive observables for auto-save
- **Formik for React Native forms:** react-hook-form is now preferred (better performance, smaller bundle)
- **Custom picker modals:** @gorhom/bottom-sheet provides better UX with gesture handling and accessibility

## Injury & Safety Taxonomy

Industry-standard categories for pick lists (researched from HSE UK, OIICS, construction safety best practices):

### Injury Types (RIDDOR Specified + Minor Injuries)
**RIDDOR Reportable (Specified Injuries):**
- Fracture (except fingers/thumbs/toes)
- Amputation (arm, hand, finger, thumb, leg, foot, toe)
- Loss of sight (permanent or reduction)
- Crush injury (brain or internal organs)
- Serious burn (>10% body surface or vital organs)
- Loss of consciousness (from head injury or asphyxia)
- Scalping (traumatic separation of skin from head)
- Hypothermia, heat-induced illness, resuscitation, or 24hr+ hospitalization from confined space

**Minor Injuries (First Aid):**
- Laceration (minor cut)
- Abrasion (graze, scrape)
- Contusion (bruise)
- Sprain/strain
- Puncture wound
- Minor burn (<10% surface)
- Foreign body in eye
- Headache
- Nausea/dizziness
- Insect bite/sting
- Splinter
- Blister

### Body Parts (OIICS-based, simplified for mobile)
- Head/Face
- Eye
- Neck
- Shoulder
- Arm/Elbow
- Wrist/Hand
- Finger/Thumb
- Chest/Ribs
- Back/Spine
- Abdomen
- Hip/Pelvis
- Leg/Knee
- Ankle/Foot
- Toe
- Multiple body parts

### Treatment Types (First Aid Categories)
- Cleaned and dressed wound
- Applied antiseptic/antibacterial
- Applied bandage/dressing
- Applied ice pack/cold compress
- Applied pressure to stop bleeding
- Removed foreign body
- Eye wash/irrigation
- Rest in welfare area
- Paracetamol/pain relief provided
- Water/rehydration
- Monitored (no treatment required)
- Referred to GP (general practitioner)
- Referred to A&E (accident & emergency)
- Called ambulance

### Outcome Categories
- Returned to work (same duties)
- Returned to work (light duties)
- Sent home (rest advised)
- Referred to GP
- Referred to A&E
- Ambulance called
- Hospitalized

### Near-Miss Categories (Construction Hazards)
- Fall from height (potential)
- Struck by moving object
- Struck by falling object
- Slip, trip, or fall (same level)
- Electrical hazard
- Fire/explosion hazard
- Confined space hazard
- Lifting/manual handling
- Plant/vehicle incident
- Structural collapse/instability
- Chemical/hazardous substance
- Environmental (weather, flooding)
- Other

### Daily Safety Check Items (Construction Standard)
1. First aid kit stocked and accessible
2. AED (defibrillator) functional and accessible
3. Eyewash station functional
4. Welfare facilities clean and operational
5. Site access routes clear and safe
6. PPE available and in good condition
7. Housekeeping (site tidy, no trip hazards)
8. Weather conditions safe for work
9. Visible hazards identified and controlled
10. Emergency vehicle access clear

**Source:** [HSE RIDDOR reportable incidents](https://www.hse.gov.uk/riddor/reportable-incidents.htm), [OIICS classification manual](https://www.bls.gov/iif/definitions/occupational-injuries-and-illnesses-classification-manual.htm), [Construction safety best practices 2026](https://www.xenia.team/articles/best-construction-safety-inspection-software)

## Open Questions

Things that couldn't be fully resolved:

1. **Voice-to-text for near-miss descriptions (NEAR-04)**
   - What we know: expo-speech-recognition exists but requires config plugin (not available in Expo Go), implements iOS SFSpeechRecognizer + Android SpeechRecognizer, supports offline on-device recognition
   - What's unclear: Quality of on-device recognition for construction terminology, whether medical/safety jargon is recognized accurately, whether it works reliably with background noise on construction sites
   - Recommendation: Defer to Phase 3 testing. Implement text input first, add voice-to-text as optional enhancement if user testing shows demand. Include in PLAN.md as "optional enhancement" task.

2. **Photo annotation timing in treatment workflow**
   - What we know: @markerjs/react-native-markerjs provides arrows/circles/text annotation, CONTEXT.md says "Claude's discretion on photo capture timing"
   - What's unclear: Should annotation happen immediately after photo capture (inline) or as separate step after all photos captured (end-of-workflow)? Construction medics may want to mark injury location on photo immediately while fresh in mind, or may want to capture all photos quickly then annotate later.
   - Recommendation: Plan for TWO modes: (1) Quick capture mode—no annotation, capture 4 photos fast (<10 seconds), (2) Detailed mode—optional annotation after each photo. Make annotation optional, not required, to avoid slowing quick workflows. Test with Kai (target user) to determine default.

3. **Worker history accessibility pattern (2-tap emergency access, WORK-04)**
   - What we know: Requirement is "2 taps during emergency", CONTEXT.md says "optimize for mobile visibility and emergency access"
   - What's unclear: What's the 2-tap path? (1) Home → Worker → History, (2) Treatment form → Worker tap → History, (3) Dedicated "Emergency" tab → Worker → History? Where should emergency access live in IA?
   - Recommendation: Plan for Home screen "Emergency Access" quick action card (large tap target) → Recent workers list (sorted by last treatment date) → Worker profile with history. Alternative: Treatment form has "View History" button next to worker search (conditional, only appears after worker selected). Test both with Kai.

4. **Daily checklist completion tracking (persistent vs daily reset)**
   - What we know: DAILY-01 says "complete 10-item checklist each morning", DAILY-04 says "app prompts medic when opening on workday morning", CONTEXT.md says "Claude's discretion on completion tracking"
   - What's unclear: If medic completes 6/10 items then closes app, should incomplete items persist until completed or reset next morning? Construction sites have varying shift patterns (7am-5pm, night shifts, weekend work)—how to define "morning"?
   - Recommendation: Plan for DAILY RESET at 6am local time. Incomplete items from previous day are archived (visible in history, not editable). Medic starts fresh checklist each morning. Rationale: Daily snapshot reflects conditions at start of shift, not continuous throughout day. Flag incomplete previous-day checklists on dashboard for site manager visibility (DAILY-05).

## Sources

### Primary (HIGH confidence)
- [Expo ImagePicker SDK docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/) - Photo selection, multiple photos, quality control
- [Expo ImageManipulator SDK docs](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) - Resize, compression, format conversion
- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/) - Offline patterns, state management recommendations
- [React Native Accessibility docs](https://reactnative.dev/docs/accessibility) - Tap target sizes, accessibility props
- [HSE RIDDOR Reportable Incidents](https://www.hse.gov.uk/riddor/reportable-incidents.htm) - UK injury reporting requirements
- [HSE RIDDOR Specified Injuries](https://www.hse.gov.uk/riddor/specified-injuries.htm) - Injury taxonomy
- [react-native-signature-canvas npm](https://www.npmjs.com/package/react-native-signature-canvas) - Signature capture library
- [WatermelonDB GitHub](https://github.com/Nozbe/WatermelonDB) - Reactive observables, offline database
- [@gorhom/react-native-bottom-sheet docs](https://gorhom.dev/react-native-bottom-sheet/) - Bottom sheet modals, gesture handling
- [react-hook-form docs](https://react-hook-form.com/) - Form state management, React Native support

### Secondary (MEDIUM confidence)
- [Mobile accessibility tap target sizes guide](https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/) - 48pt minimum, spacing recommendations (verified with official iOS/Android guidelines)
- [Construction safety inspection software 2026 comparison](https://www.xenia.team/articles/best-construction-safety-inspection-software) - Industry patterns for daily checklists, photo-first workflows (verified with multiple sources)
- [Near-miss reporting software best practices](https://connecteam.com/best-near-miss-reporting-software/) - Mobile-first near-miss workflows, photo capture patterns (verified with HSE guidance)
- [OIICS classification manual](https://www.bls.gov/iif/definitions/occupational-injuries-and-illnesses-classification-manual.htm) - Body part taxonomy, injury type categories (US-based, adapted for UK)
- [React Native offline-first patterns 2026](https://relevant.software/blog/react-native-offline-first/) - Auto-save patterns, sync strategies (verified with WatermelonDB docs)

### Tertiary (LOW confidence - requires validation)
- [Construction injury body parts research](https://www.mdpi.com/1660-4601/21/12/1655) - Body part categories from academic research (2024 publication, construction-specific, needs field validation)
- [First aid treatment categories UK](https://www.mandatorytraining.co.uk/blogs/first-aid-and-cpr/first-aid-treatment-for-minor-injuries) - Minor injury classification (commercial source, verify with NHS or St John Ambulance)
- [HSE construction hazards list](https://www.hse.gov.uk/construction/safetytopics/index.htm) - Near-miss categories (general guidance, not explicit taxonomy—needs structured categorization)
- [UI form design 2026 guide](https://www.interaction-design.org/literature/article/ui-form-design) - Mobile form patterns (general UX, not construction-specific—validate with target user)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Expo SDK documentation, mature libraries with 4k-40k GitHub stars, verified compatibility
- Architecture: HIGH - WatermelonDB patterns verified in official docs, offline-first patterns tested in production apps, accessibility guidelines from official Apple/Google sources
- Injury taxonomy: MEDIUM - HSE RIDDOR categories are authoritative (UK law), minor injury categories synthesized from multiple sources, needs field validation with Kai
- Gloves-on UX patterns: MEDIUM - 48pt minimum verified with iOS/Android guidelines, 56pt recommendation from accessibility research, construction-specific patterns synthesized from industry software reviews
- Daily checklist patterns: MEDIUM - Green/Amber/Red pattern is industry standard (verified across multiple construction safety apps), timing/reset logic needs validation with target user

**Research date:** 2026-02-15
**Valid until:** ~30 days (2026-03-15) for Expo SDK and library versions, indefinite for HSE RIDDOR taxonomy (UK law, stable), 90 days for construction industry UX patterns (fast-moving)

**Validation needed:**
- Test photo compression pipeline with real construction site photos (12MP+, bright sunlight, dust/dirt) to verify 100-200KB target achievable
- Validate injury/treatment taxonomies with Kai (target user) to confirm categories match real-world construction site incidents
- User test preset templates, daily checklist, and near-miss workflows with construction medics to verify <30s, <5min, <45s speed targets achievable
- Test gloves-on usability with actual work gloves (leather construction gloves, nitrile medical gloves) to verify 56pt tap targets sufficient
