// 驗證組成與依賴圖，計算可確定的 tag 繼承，依查詢產生輸出列。

import { compareWithoutCase } from './find-files.mjs';

// Tag 必須含一到三段小寫字母或數字。
export const TAG_NAME = /^[a-z0-9]+(?:-[a-z0-9]+){0,2}$/;

/** 比較相對路徑。只有大小寫不同時，以原始路徑固定順序。 */
function comparePaths(left, right) {
  return compareWithoutCase(left, right) || (left < right ? -1 : Number(left > right));
}

/** 驗證邊及宣告的 tag。只把可用的資料放入圖。 */
function indexDocuments(ordered, { knownTags, resolveTarget }, report) {
  const nodes = new Map(ordered.map(document => [document.file, {
    document, outgoing: [], incoming: [], children: [], declared: new Map(), inherited: new Map(),
  }]));
  const used = new Set();
  for (const node of nodes.values()) {
    const { document } = node;
    for (const { name, line } of document.tags) {
      if (!knownTags.has(name)) {
        report(document.file, 'unknown tag "' + name + '"', line);
      } else if (node.declared.has(name)) {
        report(document.file, 'duplicate tag "' + name + '"', line);
      } else {
        node.declared.set(name, line);
        used.add(name);
      }
    }
    const seen = new Set();
    for (const item of document.relations) {
      let target;
      try {
        target = resolveTarget(document.file, item);
      } catch (error) {
        report(document.file, error.message, item.line);
        continue;
      }
      const key = item.kind + '\t' + target;
      if (seen.has(key)) {
        report(document.file, 'duplicate relation to ' + target, item.line);
        continue;
      }
      seen.add(key);
      const destination = nodes.get(target);
      if (!item.planned && !destination) continue;
      const issue = dependencyIssue(item, { document, target, destination });
      if (issue) {
        report(document.file, issue, item.line);
        continue;
      }
      const edge = { ...item, target, source: document.file };
      node.outgoing.push(edge);
      if (destination) {
        destination.incoming.push(edge);
        if (edge.kind === 'parts') node.children.push(destination);
      }
    }
  }
  for (const tag of knownTags) {
    if (!used.has(tag)) report('docs/code-mereology.json', 'tag "' + tag + '" is not declared by any document');
  }
  return nodes;
}

/** 驗證可從檔案種類與區塊形狀確認的依賴限制。 */
function dependencyIssue({ kind }, { document, target, destination }) {
  if (kind !== 'depends') return null;
  const sourceName = document.file.split('/').at(-1);
  const targetName = target.split('/').at(-1);
  if (sourceName.slice(0, 2) !== targetName.slice(0, 2)) return 'dependency endpoints must have the same kind';
  if (sourceName.startsWith('bd-')) return null;
  if (document.hasParts || destination?.document.hasParts) return 'dependency cannot join an overview';
  if (document.partial) return 'a partial leaf cannot declare dependencies';
  return null;
}

/** 由每份組裝文件走訪組成，並驗證只靠依賴加入的 partial leaf。 */
function checkReachability(nodes, report) {
  const queue = [...nodes.values()].filter(node => node.document.file.split('/').at(-1).startsWith('bd-'));
  const reached = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    for (const child of queue[i].children) {
      if (reached.has(child)) continue;
      reached.add(child);
      queue.push(child);
    }
  }
  for (const node of nodes.values()) {
    const { file, partial } = node.document;
    if (partial) {
      if (!node.incoming.some(edge => edge.source !== file)) report(file, 'partial leaf has no incoming relation');
    } else if (!reached.has(node)) {
      report(file, 'design document is not reachable from an assembly document');
    }
  }
}

/** 回報從排序最前文件開始的組成環路徑，保留 parts 鍵所在行。 */
function reportCycle(cycle, report) {
  const sorted = cycle.map(node => node.document.file).sort(comparePaths);
  const start = cycle.findIndex(node => node.document.file === sorted[0]);
  const route = cycle.slice(start).concat(cycle.slice(0, start));
  const first = route[0].document;
  const paths = route.map(node => node.document.file);
  report(first.file, 'parts cycle: ' + [...paths, first.file].join(' -> '), first.partsLine);
}

/** 找出拓撲排序未能展開的節點中可重現的組成環。 */
function checkCycles(blocked, report) {
  const visited = new Set();
  const active = new Map();
  for (const root of blocked) {
    if (visited.has(root)) continue;
    const stack = [{ node: root, next: 0 }];
    visited.add(root);
    active.set(root, 0);
    while (stack.length) {
      const frame = stack.at(-1);
      const child = frame.node.children[frame.next++];
      if (!child) {
        active.delete(frame.node);
        stack.pop();
        continue;
      }
      if (!blocked.has(child)) continue;
      if (active.has(child)) {
        reportCycle(stack.slice(active.get(child)).map(item => item.node), report);
      } else if (!visited.has(child)) {
        visited.add(child);
        active.set(child, stack.length);
        stack.push({ node: child, next: 0 });
      }
    }
  }
}

/** 依組成拓撲傳遞 tag。環與其後代保留直接宣告，省略不完整的繼承。 */
function inheritTags(nodes, report) {
  const remaining = new Map([...nodes.values()].map(node => [
    node, node.incoming.filter(edge => edge.kind === 'parts').length,
  ]));
  const queue = [...remaining].filter(([, count]) => count === 0).map(([node]) => node);
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    remaining.delete(node);
    for (const [tag, line] of node.declared) {
      if (!node.inherited.has(tag)) continue;
      report(node.document.file, 'tag "' + tag + '" is inherited from ' + node.inherited.get(tag), line);
      node.declared.delete(tag);
    }
    for (const child of node.children) {
      for (const tag of node.declared.keys()) {
        if (!child.inherited.has(tag)) child.inherited.set(tag, node.document.file);
      }
      for (const [tag, source] of node.inherited) {
        if (!child.inherited.has(tag)) child.inherited.set(tag, source);
      }
      const pending = remaining.get(child) - 1;
      remaining.set(child, pending);
      if (pending === 0) queue.push(child);
    }
  }
  const blocked = new Set(remaining.keys());
  for (const node of blocked) node.inherited.clear();
  checkCycles(blocked, report);
}

/**
 * 從有效標頭建立供查詢的關係圖，並診斷不合法的關係與 tag。
 *
 * @param {Map<string, object>} documents 已經解析的文件。
 * @param {object} settings 有效 tag 表及路徑解析函式。
 * @param {Function} report 記錄文件錯誤。
 * @returns {Map<string, object>} 依來源路徑排序的圖節點。
 */
export function buildRelationGraph(documents, settings, report) {
  const ordered = [...documents.values()].sort((left, right) => comparePaths(left.file, right.file));
  const graph = indexDocuments(ordered, settings, report);
  checkReachability(graph, report);
  inheritTags(graph, report);
  return graph;
}

/** 從起點按最短距離展開，收集指定方向與深度內的原始邊。 */
function followedEdges(graph, { about, depth, follow }) {
  const found = new Set();
  const visited = new Set([about]);
  const queue = [{ file: about, distance: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const { file, distance } = queue[i];
    if (distance >= depth) break;
    const node = graph.get(file);
    for (const edge of node.outgoing.concat(node.incoming)) {
      const forward = edge.source === file && follow.includes(edge.kind === 'parts' ? 'c' : 'd');
      const reverse = edge.target === file && follow.includes(edge.kind === 'parts' ? 'p' : 'u');
      if (!forward && !reverse) continue;
      found.add(edge);
      const target = forward ? edge.target : edge.source;
      if (edge.planned || visited.has(target)) continue;
      visited.add(target);
      queue.push({ file: target, distance: distance + 1 });
    }
  }
  return found;
}

/**
 * 依模式取得排序後的 tabular 資料。
 *
 * @param {Map<string, object>} graph 完成驗證與繼承計算的圖。
 * @param {object} query 起點與走訪選項、tag，或全庫模式。
 * @yields {string[]} 一筆 TSV 資料的欄位。
 */
export function* queryRows(graph, query) {
  const { about, tag: requestedTag } = query;
  if (about !== undefined && !graph.has(about)) return;
  const edges = about === undefined ? null : followedEdges(graph, query);
  for (const [file, node] of graph) {
    if (requestedTag !== undefined) {
      if (node.declared.has(requestedTag)) yield [file, 'tag', requestedTag];
      else if (node.inherited.has(requestedTag)) yield [file, 'tag', requestedTag, 'inherited'];
      continue;
    }
    for (const edge of node.outgoing) {
      if (edges && !edges.has(edge)) continue;
      const row = [file, edge.kind, edge.target, edge.description];
      if (edge.planned) row.push('planned');
      yield row;
    }
    if (about !== undefined && about !== file) continue;
    for (const tag of node.declared.keys()) yield [file, 'tag', tag];
    if (about === file) {
      for (const tag of [...node.inherited.keys()].sort()) yield [file, 'tag', tag, 'inherited'];
    }
  }
}
