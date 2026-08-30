import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { XIcon } from '@/components/Icons'

export default function ShopCancelPage() {
  return (
    <div className="min-h-screen bg-black-void">
      <Navbar />
      <main className="pt-32 pb-20 px-4 min-h-[70vh]">
        <div className="max-w-md mx-auto">
          <div className="void-card p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-black-surface border border-border-mid flex items-center justify-center">
              <XIcon size={24} className="text-silver-mid" />
            </div>
            <h1 className="font-heading text-xl text-white mb-2">Checkout cancelled</h1>
            <p className="font-body text-silver-mid text-sm mb-6">
              No payment was made. You can head back to the shop and try again anytime.
            </p>
            <Link
              href="/shop"
              className="btn-primary !px-5 !py-2.5"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
