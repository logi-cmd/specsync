# SpecSync Logo 使用说明

## 文件
- `logo.svg` - 矢量版本，可无损缩放
- `logo-128.png` - 128x128px PNG版本（VS Code Marketplace 需要）

## 设计理念
- **文档图标**：代表 API Spec 文档
- **同步箭头**：代表 Spec 与 Code 的同步
- **蓝色主调**：与 VS Code 主题色一致

## 生成 128x128 PNG

### 方法 1：在线转换
1. 访问 https://convertio.co/zh/svg-png/
2. 上传 `logo.svg`
3. 下载 128x128 PNG 版本
4. 重命名为 `logo-128.png`

### 方法 2：使用 ImageMagick
```bash
convert logo.svg -resize 128x128 logo-128.png
```

### 方法 3：使用 Python
```python
from cairosvg import svg2png

svg2png(url='logo.svg', write_to='logo-128.png', output_width=128, output_height=128)
```

## 其他尺寸建议

| 用途 | 尺寸 | 文件名 |
|------|------|--------|
| VS Code Marketplace | 128x128 | logo-128.png |
| GitHub README | 200x200 | logo-200.png |
| 社交媒体 | 512x512 | logo-512.png |

## 配色方案

| 元素 | 颜色 | HEX |
|------|------|-----|
| 背景 | 蓝色 | #1976d2 |
| 文档 | 白色 | #ffffff |
| 线条 | 蓝色 | #1976d2 |
| 装饰点 | 半透明白 | rgba(255,255,255,0.6) |
