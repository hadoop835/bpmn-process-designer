<template>
  <div class="bpmn-toolbar">
    <bpmn-commands />
    <bpmn-aligns />
    <bpmn-externals />
    <div class="bpmn-toolbar-right">
      <bpmn-scales />
      <el-button-group>
        <bpmn-import />
        <bpmn-exports />
        <bpmn-previews />
      </el-button-group>
    </div>
  </div>
</template>

<script>
import BpmnImport from "./tools/Import";
import BpmnExports from "./tools/Exports";
import BpmnPreviews from "./tools/Previews";
import BpmnAligns from "./tools/Aligns";
import BpmnScales from "./tools/Scales";
import BpmnCommands from "./tools/Commands";
import BpmnExternals from "./tools/Externals";
export default {
  name: "BpmnToolbar",
  components: { BpmnExternals, BpmnCommands, BpmnScales, BpmnAligns, BpmnPreviews, BpmnExports, BpmnImport }
};
</script>
