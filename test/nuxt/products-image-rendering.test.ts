import type { CommandeLigneEquipe } from "@/types/api/commandes"
import type { DevisLigne } from "@/types/api/devis"
import type { ProductDetail, ProductListItem } from "@/types/api/produits"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it } from "vitest"
import ContentBannerArtworkPreview from "@/components/content/BannerArtworkPreview.vue"
import OrdersLineRow from "@/components/orders/LineRow.vue"
import ProductsBrandLogo from "@/components/products/BrandLogo.vue"
import ProductsHeroBanner from "@/components/products/HeroBanner.vue"
import ProductsListItem from "@/components/products/ListItem.vue"
import QuotesLineRow from "@/components/quotes/LineRow.vue"
import StatsTopSellingProductsCard from "@/components/stats/TopSellingProductsCard.vue"
import TaxonomyCategoryProductCard from "@/components/taxonomy/CategoryProductCard.vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

/**
 * WHAT THIS FILE PROVES, AND WHY `.env.test` HAS TO SHARE ONE HOST.
 *
 * Supabase is served behind the API's own domain, so banner artwork and product
 * images come from the same host, and that host is in `image.domains` — IPX
 * trusts it. These tests used to pass because the catalogue host was left out of
 * that list, which proved nothing about the components: the day an environment
 * named the host twice, every product image went through the panel's own IPX
 * and nothing in the markup changed. Each product-image call site is listed
 * below so that one reverted to a bare `<NuxtImg>` fails here, not in production.
 */
const imageUrl = "/fichiers/produits/3391/product.webp"

function configuredImageUrl() {
  const origin = useRuntimeConfig().public.catalogueImageOrigin
  return origin ? new URL(imageUrl, origin).toString() : imageUrl
}

const listProduct: ProductListItem = {
  id: 3391,
  slug: "imprimante-hp-laserjet-pro-m404dn",
  nom: "Imprimante HP LaserJet Pro M404dn",
  prix: 318_000,
  prix_reference: null,
  remise_pct: null,
  statut_stock: "en_stock",
  quantite_stock: 10,
  marque: "HP",
  categorie_principale_id: 301,
  retire_le: null,
  categorie: "Imprimantes",
  rayon: "impression",
  image: imageUrl,
}

const detailProduct: ProductDetail = {
  ...listProduct,
  nom_source: null,
  ajoute_le: "2026-08-22T10:05:00.000Z",
  url_source: null,
  caracteristiques: [],
  description: null,
  fiche_technique: null,
  inventaire: {
    produit_id: 3391,
    quantite_stock: 10,
    statut_stock: "en_stock",
    modifie_le: null,
    disponibilite_forcee: null,
  },
  categorie_nom: "Imprimantes",
  images: [{ rang: 1, url: imageUrl, chemin_local: "3391/product.webp", octets: 1, alt: "Imprimante" }],
  categories: [],
  historique: [],
  fiche_pdf: null,
  fiche_pdf_nom: null,
  fiche_pdf_octets: null,
}

const orderLine: CommandeLigneEquipe = {
  id: "ligne-1",
  rang: 1,
  produitId: detailProduct.id,
  slug: detailProduct.slug,
  nomCapture: detailProduct.nom,
  quantite: 1,
  quantiteRemise: 0,
  statutLigne: "commandee",
  motifEcart: null,
  prixCapture: detailProduct.prix,
  prixFerme: null,
}

const quoteLine: DevisLigne = {
  id: "devis-ligne-1",
  devisId: "devis-1",
  rang: 1,
  produitId: detailProduct.id,
  slug: detailProduct.slug,
  nomFige: detailProduct.nom,
  prixFige: detailProduct.prix,
  quantite: 1,
}

// Order and quote lines carry only a produitId: their photo comes from the
// product detail query, which only `direction`/`comptoir` may run.
function seedLineProduct() {
  const queryClient = useNuxtApp().$queryClient
  queryClient.setQueryData(["v1", "moi"], {
    userId: "u1",
    membreId: "m1",
    nom: "Awa Admin",
    courriel: "admin@example.com",
    roles: ["direction"],
  })
  queryClient.setQueryData(apiQueryKeys.products.detail(detailProduct.id), detailProduct)
}

const productCallSites = [
  {
    name: "products list thumbnail",
    selector: "[data-testid='products-list-item-thumbnail'] img",
    mount: () => mountSuspended(ProductsListItem, { props: { product: listProduct } }),
  },
  {
    name: "product detail hero",
    selector: "[data-testid='products-hero-banner'] img",
    mount: () => mountSuspended(ProductsHeroBanner, { props: { product: detailProduct } }),
  },
  {
    name: "category product card",
    selector: "[data-testid='category-product-image']",
    mount: () => mountSuspended(TaxonomyCategoryProductCard, { props: { product: listProduct } }),
  },
  {
    name: "top-selling products thumbnail",
    selector: "img",
    // The statistics endpoint already sends an absolute URL.
    mount: () =>
      mountSuspended(StatsTopSellingProductsCard, {
        props: { products: [{ id: detailProduct.id, name: detailProduct.nom, image: configuredImageUrl(), sales: 3 }] },
      }),
  },
  {
    name: "order line",
    selector: "[data-testid='orders-detail-line-image']",
    mount: () => {
      seedLineProduct()
      return mountSuspended(OrdersLineRow, { props: { line: orderLine, showTotal: true } })
    },
  },
  {
    name: "quote line",
    selector: "[data-testid='quotes-detail-line-image']",
    mount: () => {
      seedLineProduct()
      return mountSuspended(QuotesLineRow, { props: { line: quoteLine } })
    },
  },
]

describe("product image rendering", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  /* Without this, a `.env.test` that drifts back to two hosts would turn every
     assertion below into a check of the environment rather than the components. */
  it("runs against a catalogue host that IPX does trust", () => {
    const origin = useRuntimeConfig().public.catalogueImageOrigin
    expect(origin).not.toBe("")
    expect(useImage().options.domains).toContain(new URL(origin).host)
  })

  it.each(productCallSites)(
    "serves the $name as the backend sends it, not through IPX",
    async ({ selector, mount }) => {
      const wrapper = await mount()
      await flushPromises()

      try {
        const src = wrapper.get(selector).attributes("src")
        expect(src).toBe(configuredImageUrl())
        expect(src).not.toContain("/_ipx/")
        expect(wrapper.get(selector).attributes("data-nuxt-img")).toBeDefined()
      } finally {
        wrapper.unmount()
      }
    },
  )

  it("renders brand logos through Nuxt Image without rewriting their URLs", async () => {
    const logoUrl = "https://img.logo.dev/nowtech.example?token=test"
    const wrapper = await mountSuspended(ProductsBrandLogo, {
      props: { brand: "NowTech", imageUrl: logoUrl, testIdPrefix: "products-brand-logo" },
    })

    try {
      const image = wrapper.get("[data-testid='products-brand-logo-image']")
      expect(image.attributes("src")).toBe(logoUrl)
      expect(image.attributes("data-nuxt-img")).toBeDefined()
      expect(image.attributes("src")).not.toContain("/_ipx/")
    } finally {
      wrapper.unmount()
    }
  })

  /* The opt-out has to stay an opt-out: banner artwork on that very same host is
     a multi-MB original that still needs resizing. */
  it("still sends banner artwork on the shared host through IPX", async () => {
    const bannerUrl = new URL(
      "/supabase/storage/v1/object/public/branding/bannieres/large-1.jpg",
      useRuntimeConfig().public.catalogueImageOrigin,
    ).toString()
    expect(new URL(bannerUrl).host).toBe(new URL(configuredImageUrl()).host)

    const wrapper = await mountSuspended(ContentBannerArtworkPreview, {
      props: { src: bannerUrl, alt: "", aspectClass: "aspect-video", testid: "banner-preview" },
    })

    try {
      const image = wrapper.get("img")
      expect(image.attributes("src")).toContain("/_ipx/")
      expect(image.attributes("data-nuxt-img")).toBeDefined()
    } finally {
      wrapper.unmount()
    }
  })
})
