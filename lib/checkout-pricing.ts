// Prices, shipping and tax for checkout. Shared by the checkout page, which shows
// the totals, and the payment API, which recomputes them from stored product
// prices so the amount charged can't be changed from the browser. All amounts
// are in Naira.

export const lagosShippingOptions = [
  { id: 'lagos-mainland-1', name: 'Lagos Mainland 1', price: 1500, description: 'Allen Avenue, Opebi, Toyin Ikeja' },
  { id: 'lagos-mainland-2', name: 'Lagos Mainland 2', price: 2000, description: 'Computer village, Alausa, Oregun Ikeja' },
  { id: 'lagos-mainland-3', name: 'Lagos Mainland 3', price: 3000, description: 'Omole phase 1 & 2, Magodo, Ogudu, Ojota, Oko oba, Agege' },
  { id: 'lagos-mainland-4', name: 'Lagos Mainland 4', price: 3500, description: 'Surulere, Yaba, Bariga, Gbagada, Ajao estate, Anthony, Ikosi, Ketu, Iju ishaga, Oshodi, Maryland, Mushin, Ilupeju' },
  { id: 'lagos-mainland-5', name: 'Lagos Mainland 5', price: 4500, description: 'Iyana ipaja, Ikotun, Egbeda, Abule Egba, Amuwo odofin, Igando, Festac, Meiran, Ayobo, Ago palace way, Satellite town, idimu, Ijaiye, Ejigbo' },
  { id: 'lagos-mainland-6', name: 'Lagos Mainland 6', price: 5000, description: 'Ojokoro, Ikorodu, Akute, Alagbado' },
  { id: 'lagos-island-1', name: 'Lagos Island 1', price: 4500, description: 'Eko idumota, IKOYI, Victoria island, Oniru' },
  { id: 'lagos-island-2', name: 'Lagos Island 2', price: 4500, description: 'Lekki, Agungi, Ikate, Ologolo' },
  { id: 'lagos-island-3', name: 'Lagos Island 3', price: 3000, description: 'CHEVRON, VGC, ORCHID, IKOTA, AJAH, IGBO-EFON' },
  { id: 'sangotedo', name: 'Sangotedo', price: 2000, description: '' },
  { id: 'abijo-awoyaya', name: 'Abijo/Awoyaya', price: 3000, description: '' },
];

export const otherShippingOptions = [
  { id: 'gig-logistics', name: 'GIG Logistics', price: 6000, description: "Tracked delivery outside Lagos. 3-5 working days. Price may be higher for orders over 2kg." },
  { id: 'international-delivery', name: 'International Delivery', price: 3000, description: "Outside Nigeria. Price determined by weight. Agent will contact you." },
  { id: 'bus-park-delivery', name: 'Bus Park Delivery', price: 1000, description: '' },
];

export type DeliveryType = "lagos" | "other"

// The one option that ships outside Nigeria; every other option needs a Nigerian address
export const INTERNATIONAL_OPTION_ID = 'international-delivery'

// VAT charged on the subtotal
export const VAT_RATE = 0.025

// Round to whole kobo
export const roundNaira = (amount: number) => Math.round(amount * 100) / 100

export const getShippingOption = (deliveryType: DeliveryType, optionId: string) =>
  (deliveryType === "lagos" ? lagosShippingOptions : otherShippingOptions).find((option) => option.id === optionId)

// What one unit costs, applying the product's percentage discount the same way the cart does
export const unitPrice = (product: { price: number; discount?: number }) =>
  roundNaira(product.discount ? product.price * (1 - product.discount / 100) : product.price)

export const computeTotals = (lineTotals: number[], shipping: number) => {
  const subtotal = roundNaira(lineTotals.reduce((sum, line) => sum + line, 0))
  const tax = roundNaira(subtotal * VAT_RATE)
  return { subtotal, shipping, tax, total: roundNaira(subtotal + shipping + tax) }
}
