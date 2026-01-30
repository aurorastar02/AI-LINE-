
export interface CharacterPreset {
  id: string;
  species: string;
  features: string;
  clothing: string;
}

export const animalDatabase: CharacterPreset[] = [
  // 🐕 汪星人系列 (犬種擴充)
  { id: 'golden_retriever', species: '黃金獵犬 (Golden Retriever)', features: 'Golden Retriever puppy, shiny gold fur, friendly smile, fluffy ears.', clothing: '亮藍色項圈' },
  { id: 'shiba_red', species: '柴犬 (Shiba Inu)', features: 'Shiba Inu, orange-red fur, white chest (Urajiro), curled tail.', clothing: '綠色唐草紋領巾' },
  { id: 'poodle_teddy', species: '貴賓犬 (Poodle)', features: 'Poodle cub, curly brown fur, round head shape, balloon-like ears.', clothing: '粉紅色蝴蝶結' },
  { id: 'husky_silly', species: '哈士奇 (Husky)', features: 'Husky puppy, blue eyes, gray and white fur, cool but silly expression.', clothing: '紅色飛行員頭盔' },
  { id: 'border_collie', species: '邊境牧羊犬 (Border Collie)', features: 'Border Collie, black and white pattern, intelligent eyes, energetic pose.', clothing: '運動護腕' },
  { id: 'samoyed_smile', species: '薩摩耶 (Samoyed)', features: 'Samoyed, pure white fluffy fur, "smiling" face, cloud-like appearance.', clothing: '黃色小雨衣' },
  { id: 'dachshund_sausage', species: '臘腸狗 (Dachshund)', features: 'Dachshund, long brown body, very short stubby legs, floppy ears.', clothing: '彩色條紋毛衣' },
  { id: 'pomeranian_ball', species: '博美犬 (Pomeranian)', features: 'Pomeranian, tiny round ball of fur, sparkling eyes, fox-like face.', clothing: '蕾絲圍兜' },
  { id: 'french_bulldog', species: '法國鬥牛犬 (French Bulldog)', features: 'French Bulldog, bat-like ears, flat snout, stocky muscular body.', clothing: '黑色皮夾克' },
  { id: 'corgi_welsh', species: '威爾斯柯基 (Corgi)', features: 'Pembroke Welsh Corgi, peach-shaped butt, short legs, upright ears.', clothing: '紅白色棒球帽' },

  // 🐹 森林與小萌物系列
  { id: 'hamster_chubby', species: '倉鼠 (Hamster)', features: 'Chubby hamster, stuffed cheeks, tiny pink paws.', clothing: '迷你的草編帽' },
  { id: 'guinea_pig', species: '天竺鼠 (Guinea pig)', features: 'Guinea pig, tri-color patches, round body, no visible tail.', clothing: '點點圍裙' },
  { id: 'squirrel_nut', species: '松鼠 (Squirrel)', features: 'Squirrel, bushy curled tail, holding a nut, twitching nose.', clothing: '綠色小斗篷' },
  { id: 'hedgehog_soft', species: '刺蝟 (Hedgehog)', features: 'Hedgehog, soft brown spikes, round belly, tiny snout.', clothing: '迷你小草鞋' },
  { id: 'chinchilla_gray', species: '龍貓 (Chinchilla)', features: 'Chinchilla, ultra-soft gray fur, large round ears, tiny hands.', clothing: '紫色絲巾' },
  { id: 'lop_rabbit', species: '垂耳兔 (Lop Rabbit)', features: 'Lop-eared rabbit, long ears hanging down, twitching pink nose.', clothing: '蕾絲花邊連身裙' },
  { id: 'sugar_glider', species: '蜜袋鼯 (Sugar glider)', features: 'Sugar glider, large glowing eyes, gliding membrane wings, striped back.', clothing: '亮黃色防風鏡' },
  { id: 'otter_sea', species: '水獺 (Sea otter)', features: 'Sea otter, holding hands gesture, wet brown fur, floating on back.', clothing: '藍色水手服' },
  { id: 'beaver_paddle', species: '河狸 (Beaver)', features: 'Beaver, flat paddle tail, two large front teeth, wet fur texture.', clothing: '橘色安全帽' },
  { id: 'raccoon_mask', species: '浣熊 (Raccoon)', features: 'Raccoon, black eye mask, ringed tail, "washing" hands gesture.', clothing: '條紋短衫' },

  // 🦁 大型野生動物系列 (Q版化)
  { id: 'lion_cub', species: '獅子幼崽 (Lion Cub)', features: 'Lion cub, tiny fluffy mane, golden fur, large paws.', clothing: '金色小皇冠' },
  { id: 'tiger_cub', species: '小老虎 (Tiger Cub)', features: 'Tiger cub, bold black stripes, orange fur, sturdy round head.', clothing: '紅色圍巾' },
  { id: 'bear_brown', species: '小棕熊 (Brown Bear)', features: 'Brown bear cub, round ears, thick chocolate fur, clumsy pose.', clothing: '藍色吊帶褲' },
  { id: 'panda_giant', species: '大熊貓 (Panda)', features: 'Giant panda, black eye patches, round white body, eating bamboo.', clothing: '綠色腰帶' },
  { id: 'elephant_baby', species: '小象 (Elephant)', features: 'Baby elephant, large floppy ears, long trunk, gray wrinkled skin.', clothing: '紅白相間褶邊領' },
  { id: 'giraffe_baby', species: '長頸鹿 (Giraffe)', features: 'Baby giraffe, orange patches, tiny horns (ossicones), long neck.', clothing: '彩色長圍巾' },
  { id: 'koala_fuzzy', species: '無尾熊 (Koala)', features: 'Koala, large fuzzy ears, black oval nose, hugging posture.', clothing: '淺綠色睡袍' },
  { id: 'kangaroo_joey', species: '袋鼠 (Kangaroo)', features: 'Baby kangaroo (joey), large feet, long tail, peeking expression.', clothing: '印花運動服' },
  { id: 'sloth_slow', species: '樹懶 (Sloth)', features: 'Three-toed sloth, slow smile, long claws, gray-brown fur.', clothing: '粉紫色運動髮帶' },
  { id: 'hippo_baby', species: '河馬 (Hippo)', features: 'Baby hippo, round purple-gray body, tiny ears, large mouth.', clothing: '白色浴帽' },

  // ❄️ 極地與海洋系列
  { id: 'polar_bear_cub', species: '北極熊 (Polar Bear)', features: 'Polar bear cub, pure white fur, black nose, snow-dusted look.', clothing: '藍白條紋圍巾' },
  { id: 'arctic_fox_snow', species: '北極狐 (Arctic Fox)', features: 'Arctic fox, snow-white fur, very bushy tail, pointed ears.', clothing: '紅色小背心' },
  { id: 'seal_pup', species: '小海豹 (Harp Seal)', features: 'Harp seal pup, pure white fur, large watery eyes, flippers.', clothing: '藍色小領結' },
  { id: 'penguin_chick', species: '企鵝 (Penguin)', features: 'Emperor penguin chick, gray fluffy feathers, black mask.', clothing: '紅色耳罩' },
  { id: 'narwhal_spiral', species: '獨角鯨 (Narwhal)', features: 'Narwhal, spiral tusk, gray spotted skin, swimming pose.', clothing: '彩色圈圈糖領帶' },
  { id: 'sea_turtle_gentle', species: '海龜 (Sea Turtle)', features: 'Sea turtle, patterned shell, flipper-like limbs, gentle face.', clothing: '草綠色潛水鏡' },
  { id: 'octopus_cute', species: '章魚 (Octopus)', features: 'Cute octopus, pastel color, large eyes, curly tentacles.', clothing: '迷你白色水手帽' },
  { id: 'shark_baby_blue', species: '小鯊魚 (Shark)', features: 'Baby shark, blue back, white belly, sharp but cute teeth.', clothing: '救生圈裝飾' },
  { id: 'axolotl_pink', species: '六角恐龍 (Axolotl)', features: 'Axolotl, pink body, frilly external gills, smiling mouth.', clothing: '透明粉紅雨鞋' },
  { id: 'seahorse_vibrant', species: '海馬 (Seahorse)', features: 'Sea horse, curled tail, tiny fins, vibrant ocean colors.', clothing: '珍珠項鍊' },

  // 🐦 飛禽與農場系列
  { id: 'owl_chubby', species: '貓頭鷹 (Owl)', features: 'Chubby owl, large yellow eyes, feathered "horns", perched.', clothing: '黑色方型學士帽' },
  { id: 'parrot_vibrant', species: '鸚鵡 (Parrot)', features: 'Colorful parrot, vibrant tropical feathers, curved beak.', clothing: '亮黃色腳環' },
  { id: 'sparrow_round', species: '麻雀 (Sparrow)', features: 'Round sparrow, brown patterned wings, tiny beak.', clothing: '迷你的草帽' },
  { id: 'flamingo_pink', species: '紅鶴 (Flamingo)', features: 'Pink flamingo, long thin neck, standing on one leg.', clothing: '夏威夷花環' },
  { id: 'java_sparrow', species: '文鳥 (Java Sparrow)', features: 'Java sparrow, white cheeks, red beak, round white body.', clothing: '紅色領結' },
  { id: 'piglet_muddy', species: '小豬 (Piglet)', features: 'Pink piglet, curly tail, flat snout, muddy spots.', clothing: '藍色工作圍兜' },
  { id: 'lamb_white', species: '小羊 (Lamb)', features: 'Fluffy white wool, tiny black hooves, gentle eyes.', clothing: '彩色鈴鐺項圈' },
  { id: 'calf_cow', species: '小牛 (Calf)', features: 'Baby cow (calf), black and white spots, pink nose.', clothing: '紅格子圍巾' },
  { id: 'alpaca_crazy', species: '羊駝 (Alpaca)', features: 'Alpaca, long neck, crazy fluffy hair, funny teeth.', clothing: '秘魯風彩虹披風' },
  { id: 'platypus_duck', species: '鴨嘴獸 (Platypus)', features: 'Platypus, duck bill, beaver tail, webbed feet, confused look.', clothing: '偵探帽' }
];

export const getRandomPreset = () => {
  const randomIndex = Math.floor(Math.random() * animalDatabase.length);
  const p = animalDatabase[randomIndex];
  return {
    species: p.species,
    features: p.features,
    clothing: p.clothing,
    style: "Q版比例 (Chibi)，粗輪廓線，平塗色塊"
  };
};
