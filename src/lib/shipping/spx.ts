import crypto from 'crypto';

export interface SPXCheckShippingFeeRequest {
  user_id: number;
  user_secret: string;
  orders: SPXOrder[];
}

export interface SPXOrder {
  order_id?: string;
  base_info: {
    service_type: number; // 1: standard service 2: instant service
  };
  sender_info: {
    sender_country?: string;
    sender_state: string;
    sender_city: string;
    sender_district?: string;
    sender_post_code?: string;
    sender_longitude?: string;
    sender_latitude?: string;
    sender_detail_address?: string;
    sender_name?: string;
    sender_phone?: string;
    sender_address_version?: number;
  };
  fulfillment_info?: {
    payment_role?: number;
    cod_collection?: number; // 0: no 1: yes
    cod_amount?: number;
    high_value_processing_collection?: number; // 0: No 1: Yes
    collect_type?: number; // 1: pickup 2: drop off
    pickup_time?: number;
    pickup_time_range_id?: number;
    allow_mutual_check?: number;
    allow_try_on?: number;
    voucher_code?: string;
    allow_partial_delivery?: number;
  };
  deliver_info: {
    deliver_country?: string;
    deliver_state: string;
    deliver_city: string;
    deliver_district?: string;
    deliver_post_code?: string;
    deliver_longitude?: string;
    deliver_latitude?: string;
    deliver_detail_address?: string;
    deliver_name?: string;
    deliver_phone?: string;
    deliver_instruction?: string;
    deliver_address_version?: number;
  };
  parcel_info: {
    parcel_weight: number;
    parcel_length?: number;
    parcel_width?: number;
    parcel_height?: number;
    parcel_item_name?: string;
    parcel_item_quantity?: number;
    express_insured_value?: number;
  };
  vas_info?: {
    vas_types?: string[];
    collect_fee_amount?: number;
  };
  return_info?: {
    return_state?: string;
    return_city?: string;
    return_district?: string;
    return_post_code?: string;
    return_longitude?: string;
    return_latitude?: string;
    return_name?: string;
    return_phone?: string;
    return_detail_address?: string;
    return_address_version?: number;
  };
}

export interface SPXCheckShippingFeeResponse {
  ret_code: number;
  message: string;
  data: {
    orders: {
      order_id: string;
      estimated_shipping_fee: number;
      basic_shipping_fee: number;
      cod_service_fee: number;
      high_value_processing_fee: number;
      vat_fee: number;
      estimated_distance: number;
      voucher_shipping_fee: number;
      collect_fee_service_fee: number;
      partial_delivery_service_fee?: number;
      edt_max?: number;
      edt_min?: number;
    }[];
    fail_list: {
      ret_code: number;
      message: string;
      debug_msg: string;
      order_id: string;
    }[];
  };
}

/**
 * Generates the check-sign signature parameter for SPX API
 * @param payload The request body payload as an object
 * @param appId The SPX assigned App ID
 * @param appSecret The SPX assigned App Secret
 * @param timestamp The unix timestamp in seconds
 * @param randomInt A random integer
 * @returns The hex string HMAC-SHA256 signature
 */
export const generateCheckSign = (
  payload: Record<string, unknown> | unknown,
  appId: number | string,
  appSecret: string,
  timestamp: number,
  randomInt: number
): string => {
  const originalValue = [appId, timestamp, randomInt, JSON.stringify(payload)].join('_');
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(originalValue);
  return hmac.digest('hex');
};

/**
 * Check estimated shipping fee from SPX
 */
export const checkSPXShippingFee = async (
  orders: Omit<SPXOrder, 'user_id' | 'user_secret'>[]
): Promise<SPXCheckShippingFeeResponse> => {
  const appId = process.env.SPX_APP_ID;
  const appSecret = process.env.SPX_APP_SECRET;
  const userId = process.env.SPX_USER_ID;
  const userSecret = process.env.SPX_USER_SECRET;

  if (!appId || !appSecret || !userId || !userSecret) {
    throw new Error('Missing SPX configuration in environment variables');
  }

  const payload: SPXCheckShippingFeeRequest = {
    user_id: parseInt(userId, 10),
    user_secret: userSecret,
    orders: orders.map((o) => ({ ...o })),
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const randomInt = Math.round(Math.random() * timestamp);

  const checkSign = generateCheckSign(payload, parseInt(appId, 10), appSecret, timestamp, randomInt);

  // Open platform base url based on docs
  const baseUrl = 'https://spx.vn/open/api/v1/order/batch_check_order';

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'app-id': appId,
      'check-sign': checkSign,
      'timestamp': timestamp.toString(),
      'random-num': randomInt.toString(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`SPX API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SPXCheckShippingFeeResponse;
};
