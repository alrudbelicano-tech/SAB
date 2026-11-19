import { OWNER_EMAIL, type Order } from '../types';
import { formatFirestoreDate, formatPHP } from '../utils/format';

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildOrderEmailDetails(order: Order, recipientEmail?: string) {
  const subject = `[SAB Jewelry] New Order ${order.orderNumber} - PHP ${order.totalAmount.toFixed(2)} (${order.paymentMethod})`;

  const itemLines = order.items
    .map(
      (item) =>
        `  - ${item.quantity} x ${item.name} (${item.finish}, ${item.selectedSize}): ${formatPHP(
          item.unitPrice * item.quantity
        )}`
    )
    .join('\n');

  const body = [
    `New verified order placed on SAB Jewelry!`,
    ``,
    `Order Number: ${order.orderNumber}`,
    `Placed: ${formatFirestoreDate(order.createdAt)}`,
    `Status: ${order.status}`,
    ``,
    `Payment Details:`,
    `  Method: ${order.paymentMethod}`,
    `  Reference No.: ${order.paymentReference}`,
    `  Exact Amount Paid: ${formatPHP(order.amountPaid)}`,
    `  Receipt Screenshot: ${order.paymentProofUrl ? 'Attached (check Admin Orders to verify)' : 'Not attached'}`,
    ``,
    `Customer & Shipping:`,
    `  Name: ${order.customerName}`,
    `  Mobile: ${order.customerPhone}`,
    `  Email: ${order.customerEmail || 'Not provided'}`,
    ...(order.shippingProvince ? [`  Province / Area: ${order.shippingProvince}`] : []),
    ...(order.shippingZone ? [`  Courier Zone: J&T Express — ${order.shippingZone}`] : []),
    ...(order.estimatedDelivery ? [`  Estimated Delivery: ${order.estimatedDelivery}`] : []),
    `  Address: ${order.shippingAddress}`,
    ...(order.notes ? [`  Note: ${order.notes}`] : []),
    ``,
    `Items Ordered:`,
    itemLines,
    ``,
    `Subtotal: ${formatPHP(order.subtotal)}`,
    `Shipping: ${order.shippingFee === 0 ? 'FREE Nationwide (₱1,500+ promo)' : formatPHP(order.shippingFee)}`,
    `Total Paid: ${formatPHP(order.totalAmount)}`,
  ].join('\n');

  const targetEmail = (recipientEmail || '').trim() || OWNER_EMAIL;
  return {
    to: targetEmail,
    subject,
    body,
  };
}

export const CUSTOMER_SHIPPING_EMAIL_MESSAGE = [
  'Great news! Your handcrafted pieces from SAB Jewelry have been carefully packed and handed over to our courier, J&T Express, originating from our studio in Jaro, Iloilo City.',
  '',
  'Your package is now en route to you!',
].join('\n');

export function buildCustomerShippingEmailDetails(order: Order) {
  const to = (order.customerEmail || '').trim();
  const subject = `[SAB Jewelry] Your Order ${order.orderNumber} Has Shipped via J&T Express`;

  const itemLines = order.items
    .map(
      (item) =>
        `  - ${item.quantity} x ${item.name} (${item.finish}, ${item.selectedSize}): ${formatPHP(
          item.unitPrice * item.quantity
        )}`
    )
    .join('\n');

  const body = [
    `Hi ${order.customerName},`,
    ``,
    CUSTOMER_SHIPPING_EMAIL_MESSAGE,
    ``,
    `Order Number: ${order.orderNumber}`,
    ...(order.estimatedDelivery ? [`Estimated Delivery: ${order.estimatedDelivery}`] : []),
    `Delivery Address: ${order.shippingAddress}`,
    ``,
    `Items Shipped:`,
    itemLines,
    ``,
    `Total Paid: ${formatPHP(order.totalAmount)}`,
    ``,
    `You can check your live order status anytime on our website using Order Number ${order.orderNumber}.`,
    ``,
    `Warm regards,`,
    `SAB Jewelry Studio · Jaro, Iloilo City`,
  ].join('\n');

  return { to, subject, body };
}

async function sendGmailPlainText(accessToken: string, to: string, subject: string, body: string) {
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodeBase64UrlUtf8(rawEmail),
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('GMAIL_AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Gmail API returned ${res.status}`);
  }
}

export async function sendOrderNotificationToGmail(
  accessToken: string,
  order: Order,
  recipientEmail?: string
): Promise<void> {
  const { to, subject, body } = buildOrderEmailDetails(order, recipientEmail);
  await sendGmailPlainText(accessToken, to, subject, body);
}

export async function sendCustomerShippingEmail(
  accessToken: string,
  order: Order
): Promise<void> {
  const { to, subject, body } = buildCustomerShippingEmailDetails(order);
  if (!to || !to.includes('@')) {
    throw new Error('Customer did not provide a valid email address on this order.');
  }
  await sendGmailPlainText(accessToken, to, subject, body);
}
