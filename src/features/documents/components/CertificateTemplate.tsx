import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Investor, Property, Ownership } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#22304A' },
  header: { borderBottom: '2 solid #C9A227', paddingBottom: 16, marginBottom: 24 },
  brand: { fontSize: 20, fontWeight: 700, color: '#1B3057' },
  tagline: { fontSize: 9, color: '#5B6B85', marginTop: 2 },
  title: { fontSize: 16, fontWeight: 700, color: '#1B3057', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#5B6B85', textAlign: 'center', marginBottom: 28 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottom: '0.5 solid #DDE3EC' },
  label: { fontSize: 9, color: '#5B6B85', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 11, fontWeight: 700, color: '#1B3057' },
  section: { marginBottom: 20 },
  disclaimer: { fontSize: 8, color: '#5B6B85', marginTop: 32, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 40, left: 48, right: 48, fontSize: 8, color: '#8B99B0', textAlign: 'center' },
})

export function CertificateTemplate({ investor, property, ownership }: {
  investor: Investor
  property: Property
  ownership: Ownership
}) {
  const totalValue = ownership.units * ownership.acquiredPrice
  const issuedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const acquiredDate = new Date(ownership.acquiredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Propitz</Text>
          <Text style={styles.tagline}>Fractional Ownership Platform — Certificate of Ownership</Text>
        </View>

        <Text style={styles.title}>Certificate of Fractional Ownership</Text>
        <Text style={styles.subtitle}>Issued {issuedDate}</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Investor Name</Text>
            <Text style={styles.value}>{investor.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Investor Email</Text>
            <Text style={styles.value}>{investor.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Property</Text>
            <Text style={styles.value}>{property.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{property.city}, {property.state}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Units Held</Text>
            <Text style={styles.value}>{ownership.units.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Price per Unit</Text>
            <Text style={styles.value}>Rs. {ownership.acquiredPrice.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Acquisition Value</Text>
            <Text style={styles.value}>Rs. {totalValue.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Acquired On</Text>
            <Text style={styles.value}>{acquiredDate}</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This certificate evidences fractional ownership of the units stated above in the referenced
          property, subject to the terms of the Investment Agreement executed between the investor and
          Propitz Technology Pvt Ltd. This document is system-generated and does not require a physical
          signature. Investment in real estate is subject to market risks; past performance is not
          indicative of future returns.
        </Text>

        <Text style={styles.footer}>
          Propitz Technology Pvt Ltd · SEBI Registered · Generated on {issuedDate}
        </Text>
      </Page>
    </Document>
  )
}
