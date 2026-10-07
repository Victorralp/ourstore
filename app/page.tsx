"use client"

import { Suspense, lazy, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomeHero from "@/components/home/home-hero"
import TrustStrip from "@/components/home/trust-strip"
import CategoryGrid from "@/components/home/category-grid"
import HomeProducts from "@/components/home/home-products"
import HomeStores from "@/components/home/home-stores"
import ServicesBand from "@/components/home/services-band"

// Only shown to shoppers who have viewed products, so load it lazily
const PersonalizedRecommendations = lazy(async () => {
  const mod = await import("@/components/personalized-recommendations")
  return { default: mod.PersonalizedRecommendations }
})

export default function HomePage() {
  const router = useRouter()
  const [keySequence, setKeySequence] = useState<string[]>([])
  const [showSecretMessage, setShowSecretMessage] = useState(false)

  // Secret code: SERVICE (S-E-R-V-I-C-E)
  const secretCode = [
    'KeyS', 'KeyE', 'KeyR', 'KeyV', 'KeyI', 'KeyC', 'KeyE'
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+G shortcut
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        router.push('/service-provider/dashboard')
        setShowSecretMessage(true)
        setTimeout(() => setShowSecretMessage(false), 3000)
        return
      }

      // Add the pressed key to the sequence for the word-based secret
      setKeySequence(prev => {
        const newSequence = [...prev, e.code].slice(-secretCode.length)
        
        // Check if the sequence matches the secret code
        if (newSequence.length === secretCode.length && 
            newSequence.every((key, index) => key === secretCode[index])) {
          // Navigate to service provider dashboard
          router.push('/service-provider/dashboard')
          setShowSecretMessage(true)
          setTimeout(() => setShowSecretMessage(false), 3000)
        }
        
        return newSequence
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <main className="flex flex-col gap-12 bg-white pb-8 text-gray-800 md:gap-16 md:pb-12">
      <div className="flex flex-col gap-6">
        <HomeHero />
        <TrustStrip />
      </div>
      <CategoryGrid />
      <HomeProducts />
      <HomeStores />
      <Suspense fallback={null}>
        <PersonalizedRecommendations />
      </Suspense>
      <ServicesBand />

      {/* Secret message overlay */}
      {showSecretMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-2">Secret Unlocked!</h2>
            <p>Navigating to Service Provider Dashboard...</p>
          </div>
        </div>
      )}
    </main>
  )
}