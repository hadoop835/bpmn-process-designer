import palette from "./CustomPalette";
import PaletteProvider from "./CustomPaletteProvider";
// 除了引进的模块的名字可以修改，其他的不建议修改，会报错
export default {
  __depends__: [
    {
      __init__: ["palette"],
      palette: ["type", palette]
    }
  ], // 依赖于 customPalette 这个模块
  __init__: ["paletteProvider"],
  paletteProvider: ["type", PaletteProvider]
};
