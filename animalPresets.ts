
export interface CharacterPreset {
  id: string;
  species: string;   // 物種與角色名
  features: string;  // 核心長相細節 (Q版強化)
  clothing: string;  // 固定穿著配飾
}

export const animalDatabase: CharacterPreset[] = [
  {
    id: 'capybara',
    species: '佛系水豚 (Capybara)',
    features: '半閉的瞇瞇眼，頭頂放著一顆黃色柚子，身體呈長方形圓角狀，極度淡定的表情。',
    clothing: '頸部圍著一條白色的溫泉毛巾。',
  },
  {
    id: 'axolotl',
    species: '粉紅六角恐龍 (Axolotl)',
    features: '寬大的微笑嘴巴，頭側有三對粉紅色羽狀外鰓，豆豆眼，半透明的果凍感皮膚。',
    clothing: '穿著透明的星星亮片雨衣。',
  },
  {
    id: 'corgi_butt',
    species: '短腿柯基 (Corgi)',
    features: '巨大的心形屁股，三角形立耳，吐著舌頭大笑，短到看不見的腿。',
    clothing: '戴著一頂印有「BONE」字樣的黃色棒球帽。',
  },
  {
    id: 'calico_cat',
    species: '圓滾三花貓 (Calico Cat)',
    features: '身體像一顆正圓形的麻糬，短短的麒麟尾，臉上有對稱的黑色與橘色斑塊。',
    clothing: '胸前掛著一個巨大的金色招財鈴鐺。',
  },
  {
    id: 'strawberry_bunny',
    species: '草莓兔兔 (Strawberry Bunny)',
    features: '長長的耳朵下垂一隻，眼睛像紅寶石，臉頰有粉紅暈染，整體色調為奶粉色。',
    clothing: '頭上戴著一個草莓形狀的髮夾，穿著蕾絲邊女僕圍裙。',
  },
  {
    id: 'shiba_bread',
    species: '吐司柴犬 (Shiba Inu)',
    features: '臉頰肉多到垂下來，擠出迷人的笑容，顏色像烤焦的吐司，尾巴捲成一個圈。',
    clothing: '穿著一件綠色唐草紋的日式領巾。',
  },
  {
    id: 'fat_duck',
    species: '魔性小黃鴨 (Duck)',
    features: '扁平的橘色大嘴巴，眼睛只有兩個小黑點，翅膀短小，呆滯但好笑的眼神。',
    clothing: '戴著一個藍色的小水桶當帽子。',
  },
  {
    id: 'panda_ball',
    species: '圓滾滾熊貓 (Panda)',
    features: '極大的黑色黑眼圈，圓短的四肢，肚子圓鼓鼓，嘴角永遠帶著一抹憨厚。',
    clothing: '抱著一根翠綠色的嫩竹子。',
  },
  {
    id: 'red_panda',
    species: '小貓熊 (Red Panda)',
    features: '臉上有白色的眉毛標記，巨大的棕色環狀條紋尾巴，雙手舉起做出威嚇但可愛的動作。',
    clothing: '繫著一條紅白相間的粗針織圍巾。',
  },
  {
    id: 'koala_sleepy',
    species: '懶洋洋無尾熊 (Koala)',
    features: '巨大的灰色毛茸茸耳朵，黑色橢圓形大鼻子，半睜半閉的睡眼。',
    clothing: '穿著一件印有尤加利葉圖案的睡衣。',
  },
  {
    id: 'sloth_slow',
    species: '悠哉樹懶 (Sloth)',
    features: '標誌性的黑眼圈，動作極慢的手爪，臉上掛著極度緩慢且自信的微笑。',
    clothing: '穿著一件鮮豔的夏威夷花襯衫，戴著復古飛行員墨鏡。',
  },
  {
    id: 'penguin_ball',
    species: '圓球小企鵝 (Penguin)',
    features: '完美的正圓形身體，黃色的小尖嘴，走路搖搖晃晃的內八字腳。',
    clothing: '頭上戴著一個帶有螺旋槳的彩色竹蜻蜓帽子。',
  },
  {
    id: 'hedgehog_berry',
    species: '腮紅刺蝟 (Hedgehog)',
    features: '背上是柔軟的淺咖啡色刺球，粉紅色的圓臉頰，縮成一團時像個小毛球。',
    clothing: '背上黏著一顆紅色的小草莓。',
  },
  {
    id: 'elephant_bubble',
    species: '噴水小象 (Elephant)',
    features: '巨大的淺藍色大耳朵，長鼻子前端噴出一個小水泡，豆豆眼充滿好奇。',
    clothing: '頸部圍著一圈紅白相間的馬戲團風格褶飾領。',
  },
  {
    id: 'tiger_brave',
    species: '虎頭虎腦小老虎 (Tiger)',
    features: '額頭有一個鮮明的「王」字紋，圓圓的虎耳，粗短的虎尾巴。',
    clothing: '胸前戴著一個刻有「勇」字的銀色長命鎖。',
  },
  {
    id: 'fox_wink',
    species: '俏皮小狐狸 (Fox)',
    features: '巨大的白色尖尾巴，尖尖的耳朵，一隻眼睛閉起做出俏皮的眨眼動作。',
    clothing: '穿著一件綠色的森林系連帽小披風。',
  },
  {
    id: 'frog_rain',
    species: '害羞小青蛙 (Frog)',
    features: '眼睛凸出在頭頂，紅紅的腮紅，嘴巴是一條簡單的弧線。',
    clothing: '披著一片綠色的荷葉當作雨傘。',
  },
  {
    id: 'pig_pearl',
    species: '珍珠小豬 (Pig)',
    features: '粉紅色的圓豬鼻，捲曲的細尾巴，身體圓潤得像一顆大珍珠。',
    clothing: '戴著一串粉紅珍珠項鍊，頭上別著一朵小雛菊。',
  },
  {
    id: 'bee_honey',
    species: '勤勞小蜜蜂 (Bee)',
    features: '黃黑相間的條紋身體，頭上有兩根帶球的觸角，背後有一對透明的小翅膀。',
    clothing: '雙手捧著一個溢出蜂蜜的迷你木桶。',
  },
  {
    id: 'alpaca_cloud',
    species: '雲朵羊駝 (Alpaca)',
    features: '長長的脖子，身上是像雲朵一樣蓬鬆的白色捲毛，露出兩顆呆萌的大門牙。',
    clothing: '背上披著彩虹色的民族風毯子。',
  },
  {
    id: 'otter_shell',
    species: '牽手小水獺 (Otter)',
    features: '濕潤的小鼻子，短短的鬍鬚，雙手抱在胸前，呈現仰泳的姿態。',
    clothing: '胸前抱著一顆閃閃發光的粉色貝殼。',
  },
  {
    id: 'squirrel_nut',
    species: '吃貨小松鼠 (Squirrel)',
    features: '巨大的咖啡色蓬鬆尾巴，臉頰因為塞滿食物而鼓成兩大顆圓球。',
    clothing: '背著一個迷你的編織松果背包。',
  },
];

export const getRandomPreset = (): { species: string; features: string; clothing: string; style: string } => {
  const randomIndex = Math.floor(Math.random() * animalDatabase.length);
  const p = animalDatabase[randomIndex];
  return {
    species: p.species,
    features: p.features,
    clothing: p.clothing,
    style: "Q版比例 (Chibi)，粗輪廓線，平塗色塊" // 預設固定風格
  };
};
