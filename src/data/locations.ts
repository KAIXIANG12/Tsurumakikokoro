export type SupportCategory = "screen" | "cafe" | "goods" | "event";
export type SupportStatus = "active" | "pending" | "cancelled";

export interface SupportLocation {
  id: string;
  name: string;
  province: string;
  city: string;
  address: string;
  dateLabel: string;
  timeLabel: string;
  category: SupportCategory;
  status: SupportStatus;
  longitude?: number;
  latitude?: number;
  searchKeywords?: string[];
  highlight?: string;
}

export const categoryLabels: Record<SupportCategory, string> = {
  screen: "大屏",
  cafe: "生咖",
  goods: "无料",
  event: "线下"
};

export const statusLabels: Record<SupportStatus, string> = {
  active: "进行中",
  pending: "待确认",
  cancelled: "已取消"
};

export const initialSupportLocations: SupportLocation[] = [
  {
    id: "shanghai-bailian-zx",
    name: "上海百联ZX创趣场",
    province: "上海",
    city: "上海",
    address: "上海市黄浦区南京东路340号百联ZX创趣场",
    dateLabel: "待定",
    timeLabel: "待定",
    category: "screen",
    status: "pending",
    searchKeywords: ["百联zx", "百联ZX", "创趣场", "南京西路", "静安"],
    highlight: "测试点位：用于验证地图 API 地址匹配"
  }
];
