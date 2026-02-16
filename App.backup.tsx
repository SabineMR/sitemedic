// MUST be imported at top level to register background task at global scope
import './mobile/tasks/backgroundSyncTask'

import React, { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { AuthProvider } from './src/contexts/AuthContext'
import { SyncProvider } from './src/contexts/SyncContext'
import { SyncStatusIndicator } from './src/components/SyncStatusIndicator'
import { OfflineBanner } from './src/components/OfflineBanner'
import { SyncErrorDisplay } from './src/components/SyncErrorDisplay'
import { RiddorSyncAlert } from './src/components/RiddorSyncAlert'
import { PhotoUploadProgress } from './src/components/PhotoUploadProgress'
import { initDatabase } from './src/lib/watermelon'

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize database on app launch
    initDatabase()
      .then(() => {
        console.log('Database initialized successfully')
        setIsInitializing(false)
      })
      .catch((error) => {
        console.error('Database initialization failed:', error)
        setInitError(error.message)
        setIsInitializing(false)
      })
  }, [])

  // Loading screen while database initializes
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initializing SiteMedic...</Text>
      </View>
    )
  }

  // Error screen if database initialization failed
  if (initError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database initialization failed</Text>
        <Text style={styles.errorDetail}>{initError}</Text>
      </View>
    )
  }

  // Main app with providers
  return (
    <AuthProvider>
      <SyncProvider>
        <View style={styles.appContainer}>
          {/* Sync feedback layer - renders at top of screen */}
          <RiddorSyncAlert />
          <SyncErrorDisplay />
          <PhotoUploadProgress />

          {/* Existing OfflineBanner */}
          <OfflineBanner />

          {/* Existing SyncStatusIndicator and navigation */}
          <View style={styles.container}>
            <Text style={styles.text}>SiteMedic</Text>
            <SyncStatusIndicator />
          </View>
          <StatusBar style="auto" />
        </View>
      </SyncProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
