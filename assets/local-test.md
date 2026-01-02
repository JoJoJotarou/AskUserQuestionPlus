1. Launch

   ```
   npx -y @modelcontextprotocol/inspector
   ```

2. Select `Transport Type`: Streamable HTTP

3. Type `URL`: http://localhost:3456/mcp

4. Test `ask_user_question_plus` tool, use this:

   ```json
   [
     {
       "header": "咖啡偏好",
       "id": "q1",
       "text": "您更喜欢哪种咖啡来提神？",
       "type": "single",
       "multiSelect": false,
       "options": [
         {
           "label": "意式浓缩",
           "value": "espresso",
           "description": "浓郁香醇，快速提神"
         },
         {
           "label": "美式咖啡",
           "value": "americano",
           "description": "口感柔和，适合长时间饮用"
         },
         {
           "label": "拿铁/卡布奇诺",
           "value": "latte",
           "description": "奶香浓郁，口感丝滑"
         },
         {
           "label": "冷萃咖啡",
           "value": "cold_brew",
           "description": "清爽顺滑，酸度更低"
         },
         {
           "label": "不喝咖啡",
           "value": "no_coffee",
           "description": "用茶或其他方式提神"
         }
       ]
     },
     {
       "header": "音乐品味",
       "id": "q2",
       "text": "编程时您喜欢听什么类型的音乐？（可多选）",
       "type": "multiple",
       "multiSelect": true,
       "options": [
         {
           "label": "电子/环境音乐",
           "value": "electronic",
           "description": "节奏稳定，有助专注",
           "recommended": true
         },
         {
           "label": "古典音乐",
           "value": "classical",
           "description": "优雅宁静，激发灵感"
         },
         {
           "label": "爵士乐",
           "value": "jazz",
           "description": "轻松随性，创造氛围"
         },
         {
           "label": "摇滚/流行",
           "value": "rock_pop",
           "description": "节奏感强，提升能量"
         },
         {
           "label": "Lo-fi Hip Hop",
           "value": "lofi",
           "description": "放松舒缓，适合深度工作"
         },
         {
           "label": "白噪音/自然音",
           "value": "ambient",
           "description": "屏蔽干扰，保持专注"
         },
         {
           "label": "完全安静",
           "value": "silence",
           "description": "不需要任何背景声音"
         }
       ]
     },
     {
       "header": "工作空间",
       "id": "q3",
       "text": "您理想的编程工作环境是？",
       "type": "single",
       "multiSelect": false,
       "options": [
         {
           "label": "家中书房",
           "value": "home_office",
           "description": "私密舒适，完全掌控环境",
           "recommended": true
         },
         {
           "label": "咖啡厅",
           "value": "cafe",
           "description": "环境音营造专注氛围"
         },
         {
           "label": "共享办公空间",
           "value": "coworking",
           "description": "社交与专注的平衡"
         },
         {
           "label": "公司办公室",
           "value": "office",
           "description": "团队协作方便"
         },
         {
           "label": "户外/移动",
           "value": "outdoor",
           "description": "灵活自由，随处可工作"
         }
       ]
     }
   ]
   ```
