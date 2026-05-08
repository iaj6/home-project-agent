<script setup lang="ts">
import { computed } from 'vue';
import type { MaterialsList } from '@home-advisor/shared';
import ConfidenceBadge from './ConfidenceBadge.vue';

const props = defineProps<{ materials: MaterialsList }>();

const resolved = computed(() => props.materials.items.filter((i) => i.resolved));
const unresolved = computed(() => props.materials.items.filter((i) => !i.resolved));

const hdItems = computed(() => resolved.value.filter((i) => i.retailer === 'home_depot'));
const lowesItems = computed(() => resolved.value.filter((i) => i.retailer === 'lowes'));

function hdCartUrl(): string {
  const skus = hdItems.value
    .map((i) => (i.sku ? `${i.sku}:${i.qty}` : null))
    .filter(Boolean)
    .join(',');
  return skus
    ? `https://www.homedepot.com/mycart/addMultiple?skus=${encodeURIComponent(skus)}`
    : 'https://www.homedepot.com/';
}

function lowesCartUrl(): string {
  const base = 'https://www.lowes.com/cart';
  const skus = lowesItems.value
    .map((i) => (i.sku ? `${i.sku}:${i.qty}` : null))
    .filter(Boolean)
    .join(',');
  return skus ? `${base}?add=${encodeURIComponent(skus)}` : base;
}

function currency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}
</script>

<template>
  <div class="materials-cart">
    <div class="mc-header">
      <div class="mc-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <h3>Materials Cart</h3>
        <span class="zip">ZIP {{ materials.zipCode }}</span>
      </div>
      <div class="mc-actions">
        <a v-if="hdItems.length" :href="hdCartUrl()" target="_blank" rel="noopener noreferrer" class="btn-export hd">
          Export {{ hdItems.length }} to Home Depot
        </a>
        <a v-if="lowesItems.length" :href="lowesCartUrl()" target="_blank" rel="noopener noreferrer" class="btn-export lowes">
          Export {{ lowesItems.length }} to Lowe's
        </a>
      </div>
    </div>

    <table class="mc-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Unit</th>
          <th class="right">Total</th>
          <th>Source</th>
          <th>Confidence</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in resolved" :key="item.id" class="row">
          <td>
            <div class="name">
              <a v-if="item.productUrl" :href="item.productUrl" target="_blank" rel="noopener noreferrer">{{ item.name }}</a>
              <span v-else>{{ item.name }}</span>
            </div>
            <div class="spec">{{ item.spec }} {{ item.reasoning ? ` · ${item.reasoning}` : '' }}</div>
          </td>
          <td class="right">{{ item.qty }} {{ item.unit ?? '' }}</td>
          <td class="right">{{ currency(item.unitPrice) }}</td>
          <td class="right"><strong>{{ currency(item.totalPrice) }}</strong></td>
          <td>
            <span v-if="item.retailer === 'home_depot'" class="retailer hd">HD</span>
            <span v-else-if="item.retailer === 'lowes'" class="retailer lowes">Lowe's</span>
            <span v-else class="retailer">—</span>
          </td>
          <td><ConfidenceBadge :level="item.confidence" compact /></td>
        </tr>
        <tr v-for="item in unresolved" :key="item.id" class="row unresolved">
          <td>
            <div class="name">{{ item.name }}</div>
            <div class="spec">Unresolved: {{ item.unresolvedReason ?? 'no match' }}</div>
          </td>
          <td class="right">{{ item.qty }} {{ item.unit ?? '' }}</td>
          <td class="right">—</td>
          <td class="right">—</td>
          <td><span class="retailer none">—</span></td>
          <td><ConfidenceBadge level="low" compact /></td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="right"><strong>Subtotal (resolved)</strong></td>
          <td class="right"><strong>{{ currency(materials.subtotal) }}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.materials-cart {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.mc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-surface);
  gap: 1rem;
  flex-wrap: wrap;
}
.mc-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
}
.mc-title h3 {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 700;
}
.zip {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}
.mc-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.btn-export {
  display: inline-block;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
  color: white;
  transition: all 0.15s ease;
}
.btn-export.hd {
  background: #F96302;
}
.btn-export.hd:hover {
  background: #d25502;
}
.btn-export.lowes {
  background: #004990;
}
.btn-export.lowes:hover {
  background: #003c77;
}

.mc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.mc-table thead th {
  text-align: left;
  padding: 0.55rem 0.85rem;
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-light);
}
.mc-table thead th.right,
.mc-table tbody td.right,
.mc-table tfoot td.right {
  text-align: right;
}
.mc-table tbody tr {
  border-bottom: 1px solid var(--border-light);
}
.mc-table tbody tr.unresolved {
  background: var(--warning-light);
}
.mc-table tbody td {
  padding: 0.7rem 0.85rem;
  vertical-align: top;
  color: var(--text-primary);
}
.name a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.name a:hover {
  text-decoration: underline;
}
.spec {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 0.1rem;
  line-height: 1.35;
}
.retailer {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.retailer.hd {
  background: #F96302;
  color: white;
}
.retailer.lowes {
  background: #004990;
  color: white;
}
.retailer.none,
.retailer {
  background: var(--bg-surface);
  color: var(--text-tertiary);
}
.mc-table tfoot td {
  padding: 0.7rem 0.85rem;
  border-top: 2px solid var(--border);
  font-family: var(--font-heading);
}
</style>
