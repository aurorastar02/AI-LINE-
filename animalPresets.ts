
export interface AnimalPreset {
  species: string;
  features: string;
  clothing: string;
  style: string;
}

export const ANIMAL_PRESETS: AnimalPreset[] = [
  {
    species: "太空冒險倉鼠",
    features: "腮幫子鼓鼓的，戴著圓形玻璃太空頭盔，眼睛閃爍著星星光芒",
    clothing: "銀色緊身太空衣，胸前有紅色的火箭標誌",
    style: "Q版比例 (Chibi)，粗輪廓線，鮮豔色彩"
  },
  {
    species: "偵探貓頭鷹",
    features: "大大的黃色眼睛，單片眼鏡，羽毛是深咖啡色的",
    clothing: "英式格紋斗篷，戴著深藍色的福爾摩斯獵鹿帽",
    style: "2D 向量風格，平鋪色塊，粗線條"
  },
  {
    species: "嘻哈柴犬",
    features: "自信的小眼睛，嘴裡叼著一根骨頭，耳朵直立",
    clothing: "超大號黃色衛衣，戴著粗粗的金色項鍊和反戴的棒球帽",
    style: "美式 Q 版，鮮豔色塊，粗輪廓"
  },
  {
    species: "草莓大福兔子",
    features: "粉紅色的長耳朵，臉頰圓嘟嘟像大福，眼睛是亮晶晶的草莓紅色",
    clothing: "圍著一條粉紅色蕾絲圍裙，頭上戴著草莓形狀的髮卡",
    style: "日系可愛風，圓潤輪廓，柔和配色"
  },
  {
    species: "咖啡師黑熊",
    features: "溫柔的眼神，手掌大大的，胸口有一道白色的 V 字型花紋",
    clothing: "深綠色的圍裙，口袋裡插著一支攪拌棒，頭戴咖啡豆造型的小帽",
    style: "簡約向量插畫，粗黑輪廓，平塗色塊"
  },
  {
    species: "搖滾霸王龍",
    features: "雖然手很短但很有力，綠色的皮膚上有紫色條紋，表情熱血",
    clothing: "黑色皮夾克，背後印著火焰圖案，戴著一副酷酷的墨鏡",
    style: "動漫風格 Q 版，強烈對比，厚重線條"
  },
  {
    species: "芭蕾舞長頸鹿",
    features: "脖子長長的，臉上有長長的睫毛，表情優雅",
    clothing: "粉紅色的蕾絲芭蕾舞裙，蹄子上綁著粉紅色的緞帶，戴著鑲鑽頭飾",
    style: "可愛塗鴉風格，粗線條，平舖色彩"
  },
  {
    species: "極地企鵝探險家",
    features: "圓滾滾的身形，嘴巴黃黃的，眼睛圓大且好奇",
    clothing: "深咖啡色的飛行員皮革外套，戴著飛行護目鏡和藍色條紋圍巾",
    style: "2D 卡通風，粗輪廓線，乾淨色塊"
  },
  {
    species: "巫師小狐狸",
    features: "火紅色的蓬鬆大尾巴，眼神充滿智慧與調皮，耳尖有黑色的毛",
    clothing: "深紫色的法師袍，綴滿金色星星圖案，戴著尖尖的巫師帽",
    style: "Q 版奇幻風，平塗色塊，鮮明輪廓"
  },
  {
    species: "潛水員樹懶",
    features: "動作緩慢的眼神，黑色的眼圈，帶著憨厚的微笑",
    clothing: "亮橘色的潛水衣，背著黃色的氧氣瓶，頭戴專業潛水面罩",
    style: "簡約 Q 版，粗輪廓，強烈對比"
  }
];

export const getRandomPreset = (): AnimalPreset => {
  const randomIndex = Math.floor(Math.random() * ANIMAL_PRESETS.length);
  return ANIMAL_PRESETS[randomIndex];
};
