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
  x: number;
  y: number;
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

export const supportLocations: SupportLocation[] = [
  {
    id: "shanghai-dream",
    name: "星幕剧场外屏",
    province: "上海",
    city: "上海",
    address: "静安区星河广场 1 号门",
    dateLabel: "8/8",
    timeLabel: "10:00-22:00",
    category: "screen",
    status: "active",
    x: 74,
    y: 55,
    highlight: "主视觉整点轮播"
  },
  {
    id: "hangzhou-cafe",
    name: "心音生日生咖",
    province: "浙江",
    city: "杭州",
    address: "湖滨银座 B1 心音咖啡",
    dateLabel: "8/3-8/9",
    timeLabel: "11:00-20:30",
    category: "cafe",
    status: "active",
    x: 72,
    y: 59,
    highlight: "限定杯套与拍立得墙"
  },
  {
    id: "guangzhou-screen",
    name: "蓝夜中庭屏",
    province: "广东",
    city: "广州",
    address: "天河区蓝夜中心 3F 中庭",
    dateLabel: "8/8",
    timeLabel: "12:00-21:30",
    category: "screen",
    status: "pending",
    x: 63,
    y: 76
  },
  {
    id: "beijing-goods",
    name: "生日无料交换点",
    province: "北京",
    city: "北京",
    address: "朝阳区微光市集 A12",
    dateLabel: "8/6-8/8",
    timeLabel: "14:00-18:00",
    category: "goods",
    status: "active",
    x: 64,
    y: 32,
    highlight: "徽章、明信片、贴纸"
  },
  {
    id: "chengdu-event",
    name: "心愿放映会",
    province: "四川",
    city: "成都",
    address: "锦江区云端影厅 2 号厅",
    dateLabel: "8/8",
    timeLabel: "19:00-21:00",
    category: "event",
    status: "active",
    x: 47,
    y: 63
  },
  {
    id: "wuhan-screen",
    name: "江畔应援屏",
    province: "湖北",
    city: "武汉",
    address: "江汉路口沉浸屏",
    dateLabel: "8/8",
    timeLabel: "18:00-22:00",
    category: "screen",
    status: "cancelled",
    x: 61,
    y: 59,
    highlight: "天气原因取消"
  }
];
