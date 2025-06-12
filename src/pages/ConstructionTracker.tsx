import React, { useState, useEffect, useRef } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonList, IonSpinner, IonModal } from '@ionic/react';
import Plotly from 'plotly.js-dist-min';
import './ConstructionTracker.css';

interface TaskInput {
  id: string;
  name: string;
  phase: string;
  start: string;
  duration: number;
  predecessors: string;
  crew: string;
  personnel: number;
  equipment: number;
}

interface ProgressInput {
  id: string;
  budgetedCost: number;
  actualCost: number;
  percentComplete: number;
  actualStart: string;
  actualFinish: string;
}

interface CPMRow {
  activityName: string;
  start_dt: Date;
  end_dt: Date;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  TF: number;
  FF: number;
  Critical: boolean;
  ES_offset: number;
  immediatePredecessor: string[];
  immediateSuccessor: string[];
  crew: string;
  personnel: number;
  equipment: number;
  duration: number; // Added to fix the error
}

const emptyTask = (): TaskInput => ({
  id: crypto.randomUUID(),
  name: '',
  phase: '',
  start: '',
  duration: 0,
  predecessors: '',
  crew: '',
  personnel: 0,
  equipment: 0
});

const ConstructionTracker: React.FC = () => {
  const [projectName, setProjectName] = useState<string>('');
  const [tasks, setTasks] = useState<TaskInput[]>([emptyTask()]);
  const [progress, setProgress] = useState<ProgressInput[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [showGantt, setShowGantt] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [showResources, setShowResources] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 600);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [costVariance, setCostVariance] = useState<number>(0);
  const [scheduleVariance, setScheduleVariance] = useState<number>(0);
  const [ganttData, setGanttData] = useState<any>(null);
  const [ganttLayout, setGanttLayout] = useState<any>(null);
  const [traces, setTraces] = useState<any>(null);
  const [layout, setLayout] = useState<any>(null);

  const ganttContainer = useRef<HTMLDivElement>(null);
  const personnelContainer = useRef<HTMLDivElement>(null);
  const equipmentContainer = useRef<HTMLDivElement>(null);
  const sCurveContainer = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLIonModalElement>(null);

  // CPM Helper Functions
  const addSuccessors = (list: any[]) => {
    const dict = Object.fromEntries(list.map(t => [t.activityName, t] as const));
    list.forEach(t => {
      t.immediateSuccessor = list
        .filter((o: any) => o.immediatePredecessor.includes(t.activityName))
        .map((o: any) => o.activityName);
    });
  };

  const addCalcCols = (list: any[]) =>
    list.forEach((t: any) => {
      t.ES = 0;
      t.EF = 0;
      t.LS = 0;
      t.LF = 0;
      t.TF = 0;
      t.FF = 0;
      t.Critical = false;
      // Do NOT reset t.immediateSuccessor or t.immediatePredecessor here!
    });

  const calcEarlyDates = (list: any[]) => {
    const dict = Object.fromEntries(list.map(t => [t.activityName, t] as const));
    list.forEach((t: any) => {
      const maxPredEF = t.immediatePredecessor.length ? Math.max(...t.immediatePredecessor.map((p: string) => dict[p]?.EF || 0)) : 0;
      t.ES = maxPredEF;
      t.EF = t.ES + t.duration;
    });
  };

  const getProjectFinish = (list: any[]) => Math.max(...list.map((t: any) => t.EF), 0);

  const calcLateDates = (list: any[]) => {
    const finish = getProjectFinish(list);
    const dict = Object.fromEntries(list.map(t => [t.activityName, t] as const));
    list.slice().reverse().forEach((t: any) => {
      const minSuccLS = t.immediateSuccessor.length ? Math.min(...t.immediateSuccessor.map((s: string) => dict[s]?.LS || finish)) : finish;
      t.LF = minSuccLS;
      t.LS = t.LF - t.duration;
    });
  };

  const calcTF = (list: any[]) => list.forEach((t: any) => { t.TF = t.LF - t.EF; t.Critical = t.TF <= 0; });

  const calcFF = (list: any[]) => {
    const dict = Object.fromEntries(list.map(t => [t.activityName, t] as const));
    list.forEach((t: any) => {
      t.FF = t.immediateSuccessor.length ? Math.max(0, Math.min(...t.immediateSuccessor.map((s: string) => dict[s]?.ES || Infinity)) - t.EF) : t.TF;
    });
  };

  useEffect(() => {
    console.log('[log] - useEffect triggered, isMobile:', isMobile);
    import('aos').then(({ default: AOS }) => {
      console.log('[log] - AOS initialized');
      AOS.init({ duration: 800 });
    }).catch(err => console.error('[log] - AOS import failed:', err));

    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 600;
      console.log('[log] - Window resized, new isMobile:', newIsMobile);
      setIsMobile(newIsMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addTask = () => {
    console.log('[log] - Adding task');
    setTasks(prev => [...prev, emptyTask()]);
  };

  const removeTask = (id: string) => {
    console.log('[log] - Removing task:', id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setProgress(prev => prev.filter((p: ProgressInput) => p.id !== id));
  };

  const updateTask = (id: string, field: keyof TaskInput, value: any) => {
    console.log('[log] - Updating task:', id, field, value);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const loadExampleSchedule = () => {
    console.log('[log] - Loading example schedule');
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const examples = [
      { Task: 'A', offset: 0, length: 3, crew: 'C-1', per: 5, eq: 1 },
      { Task: 'B', offset: 0, length: 4, crew: 'C-2', per: 6, eq: 0 },
      { Task: 'C', offset: 2, length: 4, crew: 'C-1', per: 5, eq: 1, pred: ['A'] },
      { Task: 'D', offset: 2, length: 7, crew: 'C-3', per: 4, eq: 1, pred: ['A'] },
      { Task: 'E', offset: 5, length: 4, crew: 'C-1', per: 5, eq: 1, pred: ['C'] },
      { Task: 'F', offset: 5, length: 7, crew: 'C-4', per: 7, eq: 0, pred: ['C'] },
      { Task: 'G', offset: 8, length: 3, crew: 'C-5', per: 3, eq: 0, pred: ['D', 'E'] },
      { Task: 'H', offset: 11, length: 7, crew: 'C-4', per: 7, eq: 1, pred: ['F', 'G'] },
    ];
    setTasks(examples.map(e => ({
      id: crypto.randomUUID(),
      name: e.Task,
      phase: '',
      start: fmt(new Date(today.getTime() + e.offset * 24 * 3600 * 1000)),
      duration: e.length,
      predecessors: (e.pred || []).join(', '),
      crew: e.crew,
      personnel: e.per,
      equipment: e.eq
    })));
    setProgress([]);
  };

  const loadExampleProgress = () => {
    console.log('[log] - Loading example progress');
    if (tasks.length === 0) {
      setFormError('No tasks available yet. Generate a Gantt chart first.');
      return;
    }
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setProgress(tasks.map((t: TaskInput, idx: number) => ({
      id: t.id,
      budgetedCost: 1000 + idx * 100,
      actualCost: Math.round((1000 + idx * 100) * 0.8),
      percentComplete: Number(t.duration) > 1 ? 50 : 100,
      actualStart: t.start,
      actualFinish: fmt(new Date(new Date(t.start).getTime() + Math.floor(t.duration / 2) * 24 * 3600 * 1000)),
    })));
    setShowProgress(true);
  };

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const generateGantt = async () => {
    console.log('[log] - Generating Gantt chart');
    setFormError('');
    if (!projectName.trim()) {
      setFormError('Please enter a project name.');
      return;
    }

    const collectedTasks = tasks.map((t: TaskInput) => {
      const durationNum = Number(t.duration);
      if (!t.start || !t.duration || isNaN(durationNum) || durationNum <= 0) {
        setFormError(`Invalid start date or duration for task: ${t.name}`);
        return null;
      }
      const start = new Date(t.start);
      if (isNaN(start.getTime())) {
        setFormError(`Invalid date format for task: ${t.name}`);
        return null;
      }
      return {
        activityName: t.name,
        phase: t.phase,
        start: t.start,
        duration: durationNum,
        immediatePredecessor: t.predecessors.split(',').map(p => p.trim()).filter(p => p !== ''),
        crew: t.crew,
        personnel: Number(t.personnel),
        equipment: Number(t.equipment),
      };
    }).filter(t => t !== null);

    if (collectedTasks.length === 0) {
      setFormError('No valid tasks to generate Gantt chart.');
      return;
    }

    const nameSet = new Set(collectedTasks.map((t: any) => t.activityName));
    for (let t of collectedTasks) {
      for (let p of t.immediatePredecessor) {
        if (!nameSet.has(p)) {
          setFormError(`Predecessor "${p}" not found for task "${t.activityName}".`);
          return;
        }
      }
    }

    setShowGantt(true);
    await new Promise(r => requestAnimationFrame(r));
    const plt = await import('plotly.js-dist-min');
    if (ganttContainer.current) {
      const df: CPMRow[] = collectedTasks.map((t: any, i: number) => ({
        ...t,
        start_dt: new Date(t.start),
        end_dt: new Date(new Date(t.start).getTime() + t.duration * 24 * 3600 * 1000 - 24 * 3600 * 1000),
        ES: 0,
        EF: 0,
        LS: 0,
        LF: 0,
        TF: 0,
        FF: 0,
        Critical: false,
        ES_offset: 0,
        immediateSuccessor: [],
        duration: t.duration, // Ensure duration is included
      }));

      addSuccessors(df);
      addCalcCols(df);
      calcEarlyDates(df);
      calcLateDates(df);
      calcTF(df);
      calcFF(df);

      const earliestStart = new Date(Math.min(...df.map((t: CPMRow) => t.start_dt.getTime())));
      df.forEach((t: CPMRow) => {
        t.ES_offset = Math.round((t.start_dt.getTime() - earliestStart.getTime()) / (24 * 3600 * 1000));
      });
      df.sort((a: CPMRow, b: CPMRow) => a.start_dt.getTime() - b.start_dt.getTime());

      const traces = [{
        type: 'bar',
        x: df.map((t: CPMRow) => t.duration),
        y: df.map((t: CPMRow) => t.activityName),
        base: df.map((t: CPMRow) => t.ES_offset),
        orientation: 'h',
        marker: { color: df.map((t: CPMRow) => t.Critical ? '#ff3333' : '#00ffcc') },
        name: 'Tasks',
        hoverinfo: 'text',
        text: df.map((t: CPMRow) => `<b>${t.activityName}</b><br>Start: ${fmt(t.start_dt)}<br>Finish: ${fmt(t.end_dt)}<br>Duration: ${t.duration} days<br>ES: ${t.ES}, EF: ${t.EF}<br>Personnel: ${t.personnel}<br>Equipment: ${t.equipment}<br>Critical: ${t.Critical ? 'Yes' : 'No'}`),
      }];

      const layout = {
        title: { text: `${projectName} Gantt Chart`, font: { size: 24, color: '#00ffcc' }, x: 0.5, xanchor: 'center' as const },
        xaxis: { type: 'linear', title: { text: 'Days from Start', font: { size: 16, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' },
        yaxis: { title: { text: 'Tasks', font: { size: 16, color: '#f2f2f2' } }, autorange: 'reversed', categoryorder: 'array', categoryarray: df.map((t: CPMRow) => t.activityName), gridcolor: '#444444', zeroline: false, linecolor: '#555555' },
        showlegend: false,
        margin: { l: 150, r: 20, t: 80, b: 80 },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#1e1e1e',
        font: { color: '#f2f2f2' },
        height: Math.max(400, df.length * 40),
      };

      await Plotly.newPlot(ganttContainer.current, traces, layout, { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d'], displaylogo: false });
      setGanttData(traces);
      setGanttLayout(layout);

      // Resource Histograms
      const projectDuration = getProjectFinish(df);
      const timelineDates = Array.from({ length: projectDuration + 1 }, (_, i) => new Date(earliestStart.getTime() + i * 24 * 3600 * 1000));
      const personnelValues: number[] = Array(projectDuration + 1).fill(0);
      const equipmentValues: number[] = Array(projectDuration + 1).fill(0);

      df.forEach((t: CPMRow) => {
        const start = t.start_dt;
        const end = t.end_dt;
        for (let i = 0; i <= projectDuration; i++) {
          const day = timelineDates[i];
          if (day >= start && day <= end) {
            personnelValues[i] += t.personnel;
            equipmentValues[i] += t.equipment;
          }
        }
      });

      const xIso = timelineDates.map((d: Date) => d.toISOString().split('T')[0]);
      const personnelTrace = { x: xIso, y: personnelValues, type: 'bar', name: 'Personnel', marker: { color: '#00ffcc' }, hoverinfo: 'x+y', text: personnelValues.map(v => String(v)), textposition: 'auto' };
      const equipmentTrace = { x: xIso, y: equipmentValues, type: 'bar', name: 'Equipment', marker: { color: '#ff3333' }, hoverinfo: 'x+y', text: equipmentValues.map(v => String(v)), textposition: 'auto' };

      const personnelLayout = { title: { text: 'Personnel Usage Over Time', font: { size: 22, color: '#00ffcc' }, x: 0.5, xanchor: 'center' as const }, xaxis: { type: 'date', title: { text: 'Date', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' }, yaxis: { title: { text: 'Personnel Count', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' }, paper_bgcolor: '#1e1e1e', plot_bgcolor: '#1e1e1e', showlegend: false, margin: { l: 80, r: 20, t: 80, b: 60 }, height: 300, bargap: 0.1 };
      const equipmentLayout = { title: { text: 'Equipment Usage Over Time', font: { size: 22, color: '#ff3333' }, x: 0.5, xanchor: 'center' as const }, xaxis: { type: 'date', title: { text: 'Date', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' }, yaxis: { title: { text: 'Equipment Count', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' }, paper_bgcolor: '#1e1e1e', plot_bgcolor: '#1e1e1e', showlegend: false, margin: { l: 80, r: 20, t: 80, b: 60 }, height: 300, bargap: 0.1 };

      // Resource Histograms
      console.log('personnelContainer', personnelContainer.current);
      console.log('equipmentContainer', equipmentContainer.current);
      try {
        if (personnelContainer.current) await Plotly.newPlot(personnelContainer.current, [personnelTrace], personnelLayout, { responsive: true, displayModeBar: false });
      } catch (e) {
        console.error('Personnel plot failed:', e);
      }
      try {
        if (equipmentContainer.current) await Plotly.newPlot(equipmentContainer.current, [equipmentTrace], equipmentLayout, { responsive: true, displayModeBar: false });
      } catch (e) {
        console.error('Equipment plot failed:', e);
      }
      setShowResources(true);
      populateProgressSection();
    }
  };

  const populateProgressSection = () => {
    if (tasks.length > 0) {
      setProgress(tasks.map((t: TaskInput) => ({
        id: t.id,
        budgetedCost: 0,
        actualCost: 0,
        percentComplete: 0,
        actualStart: '',
        actualFinish: '',
      })));
      setShowProgress(true);
    }
  };

  const updateProgress = (id: string, field: keyof ProgressInput, value: any) => {
    setProgress(prev => prev.map((p: ProgressInput) => p.id === id ? { ...p, [field]: value } : p));
  };

  const submitProgress = async () => {
    console.log('[log] - Submitting progress');
    setFormError('');
    const joined = tasks.map((t: TaskInput, idx: number) => {
      const p = progress.find((p: ProgressInput) => p.id === t.id) || { budgetedCost: 0, actualCost: 0, percentComplete: 0, actualStart: '', actualFinish: '' };
      return {
        activityName: t.name,
        planned_start: new Date(t.start),
        planned_duration: Number(t.duration),
        budgetedCost: Number(p.budgetedCost),
        percentComplete: Number(p.percentComplete) / 100,
        actualCost: Number(p.actualCost),
        actual_start: p.actualStart ? new Date(p.actualStart) : null,
        actual_finish: p.actualFinish ? new Date(p.actualFinish) : null,
      };
    }).filter((p: any) => p !== null);

    let valid = true;
    joined.forEach((j: any) => {
      if (isNaN(j.budgetedCost) || j.budgetedCost < 0 || isNaN(j.actualCost) || j.actualCost < 0 || isNaN(j.percentComplete) || j.percentComplete < 0 || j.percentComplete > 1) {
        valid = false;
      }
    });
    if (!valid) {
      setFormError('Please correct the highlighted fields.');
      return;
    }

    const reportDate = new Date();
    const earliestStart = new Date(Math.min(...tasks.map((t: TaskInput) => new Date(t.start).getTime())));
    const cpmTasks = tasks.map((t: TaskInput) => ({
      activityName: t.name,
      start: t.start,
      duration: Number(t.duration),
      immediatePredecessor: t.predecessors.split(',').map(p => p.trim()).filter(p => p !== ''),
      Critical: false,
    }));
    addSuccessors(cpmTasks);
    addCalcCols(cpmTasks);
    calcEarlyDates(cpmTasks);
    calcLateDates(cpmTasks);
    calcTF(cpmTasks);
    calcFF(cpmTasks);
    const projectDuration = getProjectFinish(cpmTasks);
    const plannedFinish = new Date(earliestStart.getTime() + (projectDuration - 1) * 24 * 3600 * 1000);
    const timelineDates = Array.from({ length: projectDuration }, (_, i) => new Date(earliestStart.getTime() + i * 24 * 3600 * 1000));

    const pvValues: number[] = [], evValues: number[] = [], acValues: number[] = [];
    for (let day of timelineDates) {
      let pvDay = 0, evDay = 0, acDay = 0;
      joined.forEach((j: any) => {
        const ps = j.planned_start;
        const pd = j.planned_duration;
        const bc = j.budgetedCost;
        const pct = j.percentComplete;
        const as = j.actual_start;
        const af = j.actual_finish;
        const ac = j.actualCost;

        if (day < ps) pvDay += 0;
        else {
          const daysInto = Math.max(0, Math.min(pd, Math.ceil((day.getTime() - ps.getTime()) / (24 * 3600 * 1000) + 1)));
          pvDay += bc * (daysInto / pd);
        }

        if (!as || day < as) evDay += 0;
        else if (af && day >= af) evDay += bc;
        else if (day > reportDate) evDay += evValues[evValues.length - 1] || 0;
        else {
          const daysToReport = Math.max(1, Math.ceil((reportDate.getTime() - as!.getTime()) / (24 * 3600 * 1000) + 1));
          const daysIntoEv = Math.max(0, Math.min(daysToReport, Math.ceil((day.getTime() - as!.getTime()) / (24 * 3600 * 1000) + 1)));
          evDay += bc * pct * (daysIntoEv / daysToReport);
        }

        if (!as || day < as) acDay += 0;
        else if (af && day >= af) acDay += ac;
        else if (day > reportDate) acDay += acValues[acValues.length - 1] || 0;
        else {
          const daysToReportAc = Math.max(1, Math.ceil((reportDate.getTime() - as!.getTime()) / (24 * 3600 * 1000) + 1));
          const daysIntoAc = Math.max(0, Math.min(daysToReportAc, Math.ceil((day.getTime() - as!.getTime()) / (24 * 3600 * 1000) + 1)));
          acDay += ac * (daysIntoAc / daysToReportAc);
        }
      });
      pvValues.push(pvDay);
      evValues.push(evDay);
      acValues.push(acDay);
    }

    const idxReport = Math.min(timelineDates.findIndex((d: Date) => d >= reportDate) || timelineDates.length - 1, timelineDates.length - 1);
    for (let i = idxReport + 1; i < timelineDates.length; i++) {
      evValues[i] = evValues[idxReport];
      acValues[i] = acValues[idxReport];
    }

    const xIso = timelineDates.map((d: Date) => d.toISOString().split('T')[0]);
    const traces = [
      { x: xIso, y: pvValues, mode: 'lines+markers', name: 'Planned Value (PV)', line: { color: '#00ffcc', width: 2 }, hoverinfo: 'x+y' },
      { x: xIso, y: acValues, mode: 'lines+markers', name: 'Actual Cost (AC)', line: { color: '#ff3333', width: 2 }, hoverinfo: 'x+y' },
      { x: xIso, y: evValues, mode: 'lines+markers', name: 'Earned Value (EV)', line: { color: '#4444ff', width: 2 }, hoverinfo: 'x+y' },
    ];
    const layout = {
      title: { text: `S-Curve (PV / AC / EV) as of ${fmt(reportDate)}`, font: { size: 22, color: '#00ffcc' }, x: 0.5, xanchor: 'center' as const },
      xaxis: { type: 'date', title: { text: 'Date', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' },
      yaxis: { title: { text: 'Cost ($)', font: { size: 14, color: '#f2f2f2' } }, gridcolor: '#444444', zeroline: false, linecolor: '#555555' },
      paper_bgcolor: '#1e1e1e',
      plot_bgcolor: '#1e1e1e',
      legend: { font: { size: 12, color: '#f2f2f2' }, bgcolor: 'rgba(30,30,30,0.5)', bordercolor: '#444444', borderwidth: 1 },
      margin: { l: 80, r: 20, t: 80, b: 60 },
      font: { color: '#f2f2f2' },
      height: 400,
    };

    if (sCurveContainer.current) {
      console.log('sCurveContainer', sCurveContainer.current);
      try {
        await Plotly.newPlot(sCurveContainer.current, traces, layout, { responsive: true });
        setShowAnalysis(true);
      } catch (e) {
        console.error('S-Curve plot failed:', e);
      }
    }

    const pvAtReport = pvValues[idxReport];
    const evAtReport = evValues[idxReport];
    const acAtReport = acValues[idxReport];
    const newScheduleVariance = evAtReport - pvAtReport;
    const newCostVariance = evAtReport - acAtReport;
    const spi = pvAtReport !== 0 ? evAtReport / pvAtReport : (evAtReport > 0 ? Infinity : 0);
    const cpi = acAtReport !== 0 ? evAtReport / acAtReport : (evAtReport > 0 ? Infinity : 0);
    const criticalPath = cpmTasks.filter((t: any) => t.Critical).map((t: any) => t.activityName);

    setScheduleVariance(newScheduleVariance);
    setCostVariance(newCostVariance);
    setShowAnalysis(true);
    setShowInsights(true);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(true);
    modal.current?.present();
  };

  useEffect(() => {
    if (isFullscreen && ganttData && ganttLayout) {
      import('plotly.js-dist-min').then(Plotly => {
        const container = document.getElementById('fullscreen-gantt-chart');
        if (container) {
          Plotly.newPlot(container, ganttData, ganttLayout, { responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d'], displaylogo: false });
        }
      });
    }
  }, [isFullscreen, ganttData, ganttLayout]);

  // Example for S-Curve
  useEffect(() => {
    if (showAnalysis && sCurveContainer.current) {
      console.log('[S-Curve] Container:', sCurveContainer.current);
      console.log('[S-Curve] Data:', traces, layout);
      import('plotly.js-dist-min').then(Plotly => {
        try {
          if (!traces || traces.length === 0) {
            console.error('[S-Curve] No data to plot');
            return;
          }
          Plotly.newPlot(sCurveContainer.current, traces, layout, { responsive: true });
        } catch (err) {
          console.error('[S-Curve] Plotly error:', err);
        }
      });
    } else if (!sCurveContainer.current) {
      console.error('[S-Curve] Container ref is null');
    }
  }, [showAnalysis, traces, layout]);

  return (
    <IonPage className="construction-tracker-page">
      <IonHeader translucent={true}>
        <IonToolbar>
          <IonTitle>Construction Tracker</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding-top">
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <IonGrid>
            <IonRow>
              <IonCol size="12">
                <div className="form-group">
                  <label htmlFor="project-name" className="form-label">Project Name</label>
                  <IonInput
                    fill="outline"
                    className="custom-input"
                    id="project-name"
                    placeholder="e.g., Office Building Renovation"
                    value={projectName}
                    onIonChange={e => setProjectName(e.detail.value!)}
                  />
                </div>
              </IonCol>
            </IonRow>
            {formError && (
              <IonRow>
                <IonCol>
                  <p className="error-message">{formError}</p>
                </IonCol>
              </IonRow>
            )}
            {!isMobile ? (
              <IonRow>
                <IonCol size="12">
                  <div className="table-responsive form-section">
                    <table className="task-table">
                      <thead>
                        <tr>
                          <th>Task Name</th><th>Phase</th><th>Start</th><th>Duration</th><th>Predecessors</th><th>Crew</th><th>Personnel</th><th>Equipment</th><th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t: TaskInput) => (
                          <tr key={t.id}>
                            <td><IonInput fill="outline" className="custom-input" value={t.name} onIonChange={e => updateTask(t.id, 'name', e.detail.value!)} /></td>
                            <td><IonInput fill="outline" className="custom-input" value={t.phase} onIonChange={e => updateTask(t.id, 'phase', e.detail.value!)} /></td>
                            <td><IonInput fill="outline" className="custom-input" type="date" value={t.start} onIonChange={e => updateTask(t.id, 'start', e.detail.value!)} /></td>
                            <td><IonInput fill="outline" className="custom-input" type="number" value={t.duration} onIonChange={e => updateTask(t.id, 'duration', Number(e.detail.value!))} /></td>
                            <td><IonInput fill="outline" className="custom-input" value={t.predecessors} onIonChange={e => updateTask(t.id, 'predecessors', e.detail.value!)} /></td>
                            <td><IonInput fill="outline" className="custom-input" value={t.crew} onIonChange={e => updateTask(t.id, 'crew', e.detail.value!)} /></td>
                            <td><IonInput fill="outline" className="custom-input" type="number" value={t.personnel} onIonChange={e => updateTask(t.id, 'personnel', Number(e.detail.value!))} /></td>
                            <td><IonInput fill="outline" className="custom-input" type="number" value={t.equipment} onIonChange={e => updateTask(t.id, 'equipment', Number(e.detail.value!))} /></td>
                            <td><IonButton fill="solid" className="custom-button" onClick={() => removeTask(t.id)}>Remove</IonButton></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </IonCol>
              </IonRow>
            ) : (
              <IonRow>
                <IonCol size="12">
                  <IonList className="form-section">
                    {tasks.map((t: TaskInput) => (
                      <IonCard key={t.id} className="task-card form-wrapper">
                        <IonCardHeader>
                          <IonCardTitle>{t.name || 'New Task'}</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          <IonList inset>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Phase</IonLabel>
                              <IonInput fill="outline" className="custom-input" value={t.phase} onIonChange={e => updateTask(t.id, 'phase', e.detail.value!)} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Start</IonLabel>
                              <IonInput fill="outline" className="custom-input" type="date" value={t.start} onIonChange={e => updateTask(t.id, 'start', e.detail.value!)} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Duration</IonLabel>
                              <IonInput fill="outline" className="custom-input" type="number" value={t.duration} onIonChange={e => updateTask(t.id, 'duration', Number(e.detail.value!))} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Predecessors</IonLabel>
                              <IonInput fill="outline" className="custom-input" value={t.predecessors} onIonChange={e => updateTask(t.id, 'predecessors', e.detail.value!)} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Crew</IonLabel>
                              <IonInput fill="outline" className="custom-input" value={t.crew} onIonChange={e => updateTask(t.id, 'crew', e.detail.value!)} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Personnel</IonLabel>
                              <IonInput fill="outline" className="custom-input" type="number" value={t.personnel} onIonChange={e => updateTask(t.id, 'personnel', Number(e.detail.value!))} />
                            </div>
                            <div className="form-group">
                              <IonLabel position="stacked" className="form-label">Equipment</IonLabel>
                              <IonInput fill="outline" className="custom-input" type="number" value={t.equipment} onIonChange={e => updateTask(t.id, 'equipment', Number(e.detail.value!))} />
                            </div>
                          </IonList>
                          <IonButton expand="full" color="danger" className="custom-button ion-margin-top" onClick={() => removeTask(t.id)}>Remove</IonButton>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </IonList>
                </IonCol>
              </IonRow>
            )}
            <IonRow className="ion-justify-content-between ion-align-items-center" style={{ marginTop: '1rem' }}>
              <IonCol size="5">
                <IonButton expand="block" fill="solid" className="custom-button" onClick={addTask}>+ Add Task</IonButton>
              </IonCol>
              <IonCol size="5">
                <IonButton expand="block" fill="solid" className="custom-button" onClick={loadExampleSchedule}>Insert Example</IonButton>
              </IonCol>
            </IonRow>
            <IonRow className="ion-justify-content-center" style={{ marginTop: '1rem' }}>
              <IonCol size="6">
                <IonButton expand="block" fill="solid" className="custom-button" onClick={generateGantt}>Generate Plan (Gantt Chart)</IonButton>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="12">
                <div className={`gantt-chart-wrapper ${showGantt ? 'visible' : 'hidden'}`}>
                  {!showGantt && <IonSpinner name="crescent" />}
                  <div ref={ganttContainer} className="gantt-chart" onClick={toggleFullscreen} />
                </div>
              </IonCol>
            </IonRow>
            {showResources && (
              <IonRow>
                <IonCol size="6">
                  <div className="gantt-chart-wrapper">
                    <h2 style={{ color: '#00a886', marginBottom: '0.75rem' }}>Personnel Usage</h2>
                    <div ref={personnelContainer} className="gantt-chart" />
                  </div>
                </IonCol>
                <IonCol size="6">
                  <div className="gantt-chart-wrapper">
                    <h2 style={{ color: '#00a886', marginBottom: '0.75rem' }}>Equipment Usage</h2>
                    <div ref={equipmentContainer} className="gantt-chart" />
                  </div>
                </IonCol>
              </IonRow>
            )}
            {showProgress && (
              <IonRow>
                <IonCol size="12">
                  <div className="gantt-chart-wrapper">
                    <h2 style={{ color: '#00a886', marginBottom: '0.75rem' }}>Report Progress & Costs</h2>
                    <table className="task-table">
                      <thead>
                        <tr>
                          <th>Task Name</th><th>Budgeted Cost ($)</th><th>Actual Cost ($)</th><th>% Complete</th><th>Actual Start</th><th>Actual Finish</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t: TaskInput) => {
                          const p = progress.find((p: ProgressInput) => p.id === t.id) || { budgetedCost: 0, actualCost: 0, percentComplete: 0, actualStart: '', actualFinish: '' };
                          return (
                            <tr key={t.id}>
                              <td>{t.name}</td>
                              <td><IonInput fill="outline" className="custom-input" type="number" value={p.budgetedCost} onIonChange={e => updateProgress(t.id, 'budgetedCost', Number(e.detail.value))} /></td>
                              <td><IonInput fill="outline" className="custom-input" type="number" value={p.actualCost} onIonChange={e => updateProgress(t.id, 'actualCost', Number(e.detail.value))} /></td>
                              <td><IonInput fill="outline" className="custom-input" type="number" value={p.percentComplete} onIonChange={e => updateProgress(t.id, 'percentComplete', Number(e.detail.value))} /></td>
                              <td><IonInput fill="outline" className="custom-input" type="date" value={p.actualStart} onIonChange={e => updateProgress(t.id, 'actualStart', e.detail.value)} /></td>
                              <td><IonInput fill="outline" className="custom-input" type="date" value={p.actualFinish} onIonChange={e => updateProgress(t.id, 'actualFinish', e.detail.value)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <IonButton expand="block" fill="solid" className="custom-button" onClick={loadExampleProgress}>Insert Example Progress Data</IonButton>
                    <IonButton expand="block" fill="solid" className="custom-button" onClick={submitProgress} style={{ marginTop: '1rem' }}>Analyze Progress (S-Curves)</IonButton>
                  </div>
                </IonCol>
              </IonRow>
            )}
            {showAnalysis && (
              <IonRow>
                <IonCol size="12">
                  <div className="gantt-chart-wrapper">
                    <h2 style={{ color: '#00a886', marginBottom: '0.75rem' }}>Performance Analysis</h2>
                    <div ref={sCurveContainer} className="gantt-chart" />
                  </div>
                </IonCol>
              </IonRow>
            )}
            {showInsights && (
              <IonRow>
                <IonCol size="12">
                  <div className="gantt-chart-wrapper">
                    <h2 style={{ color: '#00a886', marginBottom: '0.75rem' }}>Project Insights</h2>
                    <div style={{ padding: '1rem', background: '#282828', border: '1px solid #333', borderRadius: '8px', color: '#f2f2f2' }}>
                      <p style={{ color: costVariance < 0 ? '#ff3333' : '#00ffcc' }}>
                        {costVariance < 0 ? '🔴 Over Budget: $' + Math.abs(costVariance).toLocaleString() : '🟢 Under Budget: $' + costVariance.toLocaleString()}
                      </p>
                      <p style={{ color: scheduleVariance < 0 ? '#ff3333' : '#00ffcc' }}>
                        {scheduleVariance < 0 ? '🔴 Behind Schedule: $' + Math.abs(scheduleVariance).toLocaleString() : '🟢 Ahead of Schedule: $' + scheduleVariance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </IonCol>
              </IonRow>
            )}
          </IonGrid>
        </div>
      </IonContent>
      <IonModal ref={modal} isOpen={isFullscreen} onDidDismiss={() => setIsFullscreen(false)}>
        <IonContent>
          <div style={{ width: '100%', height: '90vh', background: '#1e1e1e', padding: '1rem' }}>
            <span style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer', fontSize: '24px', color: '#fff' }} onClick={() => modal.current?.dismiss()}>×</span>
            <div id="fullscreen-gantt-chart" style={{ width: '100%', height: 'calc(100% - 20px)' }} />
          </div>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default ConstructionTracker;