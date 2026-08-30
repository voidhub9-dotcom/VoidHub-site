'use client'

import { TagIcon, ClockIcon, CartIcon, ImageIcon } from '@/components/Icons'

export interface PublicShopProduct {
  id: string
  name: string
  description: string
  priceCents: number
  currency: string
  durationLabel: string
  imageUrl: string
  category: string
  stock: number
  soldCount: number
}

interface ShopProductCardProps {
  product: PublicShopProduct
  onBuy: (product: PublicShopProduct) => void
  buying: boolean
}

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export default function ShopProductCard({ product, onBuy, buying }: ShopProductCardProps) {
  const soldOut = product.stock < 1
  const lowStock = !soldOut && product.stock <= 5

  return (
    <div className="price-card flex flex-col">
      <div className="relative aspect-video w-full bg-black-surface overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={28} className="text-silver-faint" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black-card via-transparent to-transparent opacity-70" />
        {product.category && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider bg-black/60 text-silver-light border border-white/10 backdrop-blur-sm">
            <TagIcon size={10} />
            {product.category.toUpperCase()}
          </span>
        )}
        <span
          className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.65rem] font-heading tracking-wider backdrop-blur-sm ${
            soldOut
              ? 'bg-danger/20 text-danger border border-danger/30'
              : lowStock
                ? 'bg-warning/20 text-warning border border-warning/30'
                : 'bg-success/20 text-success border border-success/30'
          }`}
        >
          {soldOut ? 'SOLD OUT' : `${product.stock} IN STOCK`}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="font-heading text-[1rem] text-white leading-tight">{product.name}</h3>
        <p className="font-body text-silver-mid text-[0.8rem] leading-relaxed line-clamp-2 flex-1">
          {product.description}
        </p>

        {product.durationLabel && (
          <div className="flex items-center gap-1.5 text-silver-muted text-xs font-body">
            <ClockIcon size={13} />
            <span>{product.durationLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 mt-auto">
          <span className="font-heading text-xl text-white">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <button
            onClick={() => onBuy(product)}
            disabled={soldOut || buying}
            className="btn-buy !py-2 !px-4 text-xs"
          >
            <CartIcon size={14} />
            <span>{soldOut ? 'SOLD OUT' : buying ? 'STARTING...' : 'BUY NOW'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
