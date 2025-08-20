import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface OrgNode {
  id: string;
  name: string;
  position: string;
  parentId: string | null;
  prevId: string | null;
  nextId: string | null;
  children?: OrgNode[];
}

const OrgChartView: React.FC = () => {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'curved' | 'elbow'>('straight');
  const navigate = useNavigate();
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [optimalLeaveDate, setOptimalLeaveDate] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orgChart"));
    const unsub = onSnapshot(q, (snapshot) => {
      const arr: OrgNode[] = [];
      snapshot.forEach((doc) => arr.push({ id: doc.id, ...doc.data() } as OrgNode));
      setNodes(arr);
    });
    return () => unsub();
  }, []);

  const buildTree = (flat: OrgNode[]): OrgNode[] => {
    const map: Record<string, OrgNode> = {};
    flat.forEach((n) => (map[n.id] = { ...n, children: [] }));
    const roots: OrgNode[] = [];
    flat.forEach((n) => {
      if (n.parentId) {
        map[n.parentId]?.children?.push(map[n.id]);
      } else {
        roots.push(map[n.id]);
      }
    });
    const sortSiblings = (siblings: OrgNode[]) => {
      const idToNode = Object.fromEntries(siblings.map((n) => [n.id, n]));
      const head = siblings.find((n) => n.prevId === null);
      if (!head) return siblings;
      const ordered: OrgNode[] = [];
      let curr: OrgNode | undefined = head;
      while (curr) {
        ordered.push(curr);
        curr = curr.nextId ? idToNode[curr.nextId] : undefined;
      }
      return ordered;
    };
    const walk = (node: OrgNode) => {
      if (node.children && node.children.length > 0) {
        node.children = sortSiblings(node.children);
        node.children.forEach(walk);
      }
    };
    roots.forEach(walk);
    return sortSiblings(roots);
  };

  const tree = buildTree(nodes);

  const collectConnections = (nodes: OrgNode[]): Array<{ parent: string, child: string }> => {
    const pairs: Array<{ parent: string, child: string }> = [];
    const walk = (parent: OrgNode) => {
      if (parent.children) {
        for (const child of parent.children) {
          pairs.push({ parent: parent.id, child: child.id });
          walk(child);
        }
      }
    };
    for (const root of nodes) walk(root);
    return pairs;
  };

  const getSvgLines = () => {
    const pairs = collectConnections(tree);
    const lines: JSX.Element[] = [];
    if (!svgRef.current) return lines;
    const svgRect = svgRef.current.getBoundingClientRect();
    for (const { parent, child } of pairs) {
      const parentDiv = nodeRefs.current[parent];
      const childDiv = nodeRefs.current[child];
      if (!parentDiv || !childDiv) continue;
      const parentRect = parentDiv.getBoundingClientRect();
      const childRect = childDiv.getBoundingClientRect();
      const x1 = parentRect.left + parentRect.width / 2 - svgRect.left;
      const y1 = parentRect.bottom - svgRect.top;
      const x2 = childRect.left + childRect.width / 2 - svgRect.left;
      const y2 = childRect.top - svgRect.top;
      if (connectionStyle === 'straight') {
        lines.push(<line key={parent+child} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a3a3a3" strokeWidth={2} />);
      } else if (connectionStyle === 'curved') {
        const mx = (x1 + x2) / 2;
        lines.push(
          <path
            key={parent+child}
            d={`M${x1},${y1} C${mx},${y1+20} ${mx},${y2-20} ${x2},${y2}`}
            stroke="#60a5fa" fill="none" strokeWidth={2}
          />
        );
      } else if (connectionStyle === 'elbow') {
        lines.push(
          <polyline
            key={parent+child}
            points={`${x1},${y1} ${x1},${(y1+y2)/2} ${x2},${(y1+y2)/2} ${x2},${y2}`}
            stroke="#fbbf24" fill="none" strokeWidth={2}
          />
        );
      }
    }
    return lines;
  };

  const getColorByLevel = (level: number) => {
    const colors = [
      'bg-blue-100 text-blue-900 border-blue-200',
      'bg-pink-100 text-pink-900 border-pink-200',
      'bg-green-100 text-green-900 border-green-200',
      'bg-purple-100 text-purple-900 border-purple-200',
      'bg-yellow-100 text-yellow-900 border-yellow-200',
      'bg-sky-100 text-sky-900 border-sky-200',
    ];
    return colors[level] || 'bg-gray-100 text-gray-900 border-gray-200';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTree = (nodes: OrgNode[], level = 0) => {
    const isManyChildren = nodes.length > 8;
    return (
      <ul className={level === 0 ? "org-h-tree-root" : "org-h-tree-branch"}>
        {nodes.map((node) => (
          <li key={node.id} className="org-h-tree-node">
            <div
              className={`org-h-tree-content ${getColorByLevel(level)} border`}
              ref={el => { nodeRefs.current[node.id] = el; }}
            >
              <div className="org-h-avatar mb-2">
                {getInitials(node.name)}
              </div>
              {node.children && node.children.length > 0 && (
                <button
                  className="org-h-tree-toggle"
                  onClick={() => toggleExpand(node.id)}
                  title={expanded[node.id] ? "Collapse" : "Expand"}
                >
                  {expanded[node.id] ? "-" : "+"}
                </button>
              )}
              <div className="flex flex-col items-center">
                <span className="font-bold text-base mb-0.5 text-gray-800 dark:text-gray-100">{node.name}</span>
                <span className="text-xs opacity-80 text-gray-600 dark:text-gray-300">{node.position}</span>
              </div>
            </div>
            {node.children && node.children.length > 0 && expanded[node.id] !== false && (
              <div className={`org-h-tree-children${isManyChildren ? ' org-h-tree-children-wrap' : ''}`}>
                {renderTree(node.children, level + 1)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="max-w-full mx-auto p-6 rounded shadow org-h-bg" style={{position: 'relative'}}>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 shadow-sm transition"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Company Org Chart</h1>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="conn-style" className="text-sm text-gray-600">Connection style:</label>
          <select
            id="conn-style"
            value={connectionStyle}
            onChange={e => setConnectionStyle(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="straight">Straight</option>
            <option value="curved">Curved</option>
            <option value="elbow">Elbow</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto" style={{position: 'relative'}}>
        <div className="org-h-tree-container" style={{position: 'relative'}}>
          <svg
            ref={svgRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {getSvgLines()}
          </svg>
          <div style={{position: 'relative', zIndex: 1}}>
            {renderTree(tree)}
          </div>
        </div>
      </div>
      {optimalLeaveDate && (
        <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-xs text-center">
          <span className="font-bold">🤖 AI Suggestion:</span> Consider taking leave on {new Date(optimalLeaveDate).toLocaleDateString()} for a long weekend
        </div>
      )}
      <style>{`
        .org-h-bg {
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%);
          box-shadow: 0 4px 32px rgba(0,0,0,0.06);
        }
        .org-h-tree-container {
          padding: 36px 0 36px 0;
          min-width: 900px;
        }
        .org-h-tree-root, .org-h-tree-branch {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: flex-start;
          position: relative;
        }
        .org-h-tree-children {
          display: flex;
          flex-direction: row;
          justify-content: center;
          position: relative;
        }
        .org-h-tree-children-wrap {
          flex-wrap: wrap;
          gap: 16px 8px;
          max-width: 1200px;
        }
        .org-h-tree-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          margin: 0 32px;
        }
        .org-h-tree-content {
          border-radius: 18px;
          padding: 24px 32px 18px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          margin-bottom: 18px;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          transition: box-shadow 0.2s, background 0.2s, border 0.2s;
          border: 1.5px solid #e5e7eb;
          background: #fff;
        }
        .org-h-tree-content:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.13);
          background: #f3f4f6;
          border-color: #a5b4fc;
        }
        .org-h-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e0e7ef 0%, #f1f5f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.25rem;
          color: #64748b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          border: 2px solid #e0e7ef;
        }
        .org-h-tree-toggle {
          background: #f1f5f9;
          border: 1px solid #e0e7ef;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          margin-bottom: 6px;
          cursor: pointer;
          font-weight: bold;
          color: #0369a1;
        }
        svg line, svg path, svg polyline {
          filter: drop-shadow(0 1px 2px #e0e7ef);
          transition: stroke 0.2s;
        }
        svg line:hover, svg path:hover, svg polyline:hover {
          stroke: #6366f1 !important;
          filter: drop-shadow(0 2px 6px #a5b4fc);
        }
        @media (max-width: 900px) {
          .org-h-tree-content { min-width: 120px; padding: 16px 10px 12px 10px; }
          .org-h-avatar { width: 36px; height: 36px; font-size: 1rem; }
          .org-h-tree-node { margin: 0 8px; }
        }
        .dark .org-h-bg {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }
        .dark .org-h-tree-content {
          background: #1e293b;
          color: #f1f5f9;
          border-color: #334155;
        }
        .dark .org-h-tree-content:hover {
          background: #334155;
          border-color: #60a5fa;
        }
        .dark .org-h-avatar {
          background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
          color: #cbd5e1;
          border-color: #334155;
        }
      `}</style>
    </div>
  );
};

export default OrgChartView; 