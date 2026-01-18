// scripts/chaos/chaos-shopify.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:4000/webhooks/shopify';
const ORDER_ID = 32132141;

const getRandomDate = (date: Date) =>
  new Date(date.getTime() + Math.floor(Math.random() * 1000)).toISOString();

function makeEvent(type: 'create' | 'paid' | 'cancel' | 'pending') {
  const base = {
    id: ORDER_ID,
    name: '#chaos test order',
    created_at: getRandomDate(new Date('2026-01-18T17:00:00.000Z')),
    currency: 'USD',
    total_price: '100.00',
    shipping_address: {
      name: 'John Doe',
      address1: '123 Street',
      city: 'NYC',
      country: 'US',
    },
  };

  switch (type) {
    case 'create':
      return {
        ...base,
        financial_status: 'pending',
        updated_at: getRandomDate(new Date('2026-01-18T17:10:00.000Z')),
        cancelled_at: null,
      };

    case 'pending':
      return {
        ...base,
        financial_status: 'pending',
        updated_at: getRandomDate(new Date('2026-01-18T17:15:00.000Z')),
        cancelled_at: null,
      };

    case 'paid':
      return {
        ...base,
        financial_status: 'paid',
        updated_at: getRandomDate(new Date('2026-01-18T17:20:00.000Z')),
        cancelled_at: null,
      };

    case 'cancel':
      return {
        ...base,
        financial_status: 'cancelled',
        updated_at: getRandomDate(new Date('2026-01-18T17:25:00.000Z')),
        cancelled_at: getRandomDate(new Date('2026-01-18T17:25:00.000Z')),
      };
  }
}

async function main() {
  console.log('Chaos test started...');

  const events: { payload: any; topic: string }[] = [];

  // randomly inject create somewhere
  const createIndex = Math.floor(Math.random() * 50);
  events.splice(createIndex, 0, {
    payload: makeEvent('create'),
    topic: 'orders/create',
  });

  // produce 100 conflicting updates
  for (let i = 0; i < 100; i++) {
    const r = Math.random();
    if (r < 0.25) {
      events.push({ payload: makeEvent('paid'), topic: 'orders/updated' });
    }
    // TODO: comment or uncomment this to test cancel event
    else if (r < 0.5) {
      events.push({ payload: makeEvent('cancel'), topic: 'orders/updated' });
    } else {
      events.push({ payload: makeEvent('pending'), topic: 'orders/updated' });
    }

    // ~10% duplicates
    if (Math.random() < 0.1) {
      events.push(events[events.length - 1]);
    }
  }

  // shuffle events (Fisher–Yates)
  for (let i = events.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [events[i], events[j]] = [events[j], events[i]];
  }

  // send parallel chaos
  await Promise.all(
    events.map(({ payload, topic }) =>
      axios
        .post(BASE_URL, payload, {
          headers: {
            'x-shopify-topic': topic,
          },
        })
        .then((res) => {
          console.log('Event sent:', res.status);
        })
        .catch((err) => {
          console.log('Event failed:', err?.response?.status);
        }),
    ),
  );

  console.log('Chaos test complete — inspect DB & queues.');
}

main().catch(console.error);
