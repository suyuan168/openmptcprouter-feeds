'use strict';
'require view';
'require rpc';
'require poll';
'require dom';

var callMetricsGetAll = rpc.declare({
	object: 'metrics',
	method: 'get_all',
	expect: { '': {} }
});

return view.extend({
	/* Auto-refresh interval in seconds */
	POLL_INTERVAL: 5,

	load: function() {
		return callMetricsGetAll();
	},

	/* ------------------------------------------------------------------ *
	 *  Helpers                                                             *
	 * ------------------------------------------------------------------ */

	_fmt: function(val, unit, decimals) {
		if (val === null || val === undefined) return '—';
		return (decimals != null ? Number(val).toFixed(decimals) : val) + (unit ? ' ' + unit : '');
	},

	_fmtBytes: function(val) {
		if (val === null || val === undefined) return '—';
		if (val >= 1073741824) return (val / 1073741824).toFixed(2) + ' GB';
		if (val >= 1048576)    return (val / 1048576).toFixed(2) + ' MB';
		if (val >= 1024)       return (val / 1024).toFixed(1) + ' KB';
		return val + ' B';
	},

	_fmtBps: function(val) {
		if (val === null || val === undefined) return '—';
		if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Gbps';
		if (val >= 1e6) return (val / 1e6).toFixed(2) + ' Mbps';
		if (val >= 1e3) return (val / 1e3).toFixed(1) + ' Kbps';
		return val + ' bps';
	},

	_fmtBytesPerSec: function(val) {
		if (val === null || val === undefined) return '—';
		if (val >= 1073741824) return (val / 1073741824).toFixed(2) + ' GB/s';
		if (val >= 1048576)    return (val / 1048576).toFixed(2) + ' MB/s';
		if (val >= 1024)       return (val / 1024).toFixed(1) + ' KB/s';
		return val + ' B/s';
	},

	/* Render val as plain string; colour it if > 0 (orange warn, red error) */
	_warnVal: function(val, severity) {
		if (val === null || val === undefined) return '—';
		if (val > 0) {
			var color = (severity === 'error') ? '#f44336' : '#ff9800';
			return E('span', { style: 'color:' + color + ';font-weight:bold' }, [ String(val) ]);
		}
		return String(val);
	},

	_congestionBar: function(score, level) {
		if (score === null || score === undefined) return E('span', {}, ['—']);
		var colors = {
			'none':     '#4caf50',
			'low':      '#8bc34a',
			'moderate': '#ff9800',
			'high':     '#f44336',
			'severe':   '#b71c1c'
		};
		var labels = {
			'none':     _('None'),
			'low':      _('Low'),
			'moderate': _('Moderate'),
			'high':     _('High'),
			'severe':   _('Severe')
		};
		var color = colors[level] || '#aaa';
		var label = labels[level] || (level || '—');
		var w     = Math.max(0, Math.min(100, score));
		return E('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, [
			E('span', {
				style: 'display:inline-block;width:80px;height:10px;background:#ddd;border-radius:5px;overflow:hidden'
			}, [
				E('span', {
					style: 'display:block;height:100%;width:' + w + '%;background:' + color +
					       ';border-radius:5px;transition:width 0.3s'
				})
			]),
			E('span', {
				style: 'display:inline-block;padding:1px 6px;border-radius:4px;background:' + color +
				       ';color:#fff;font-size:0.8em;font-weight:bold'
			}, [ label ]),
			E('span', { style: 'font-size:0.82em;color:#777' }, [ '(' + score + ')' ])
		]);
	},

	_statusBadge: function(status) {
		var color = '#aaa', label = status || '—';
		if (status === 'up')      { color = '#4caf50'; label = _('Up'); }
		else if (status === 'down') { color = '#f44336'; label = _('Down'); }
		var span = E('span', {
			style: 'display:inline-block;padding:2px 8px;border-radius:4px;' +
			       'background:' + color + ';color:#fff;font-size:0.85em;font-weight:bold'
		}, [ label ]);
		return span;
	},

	_signalBar: function(pct) {
		if (pct === null || pct === undefined) return E('span', {}, ['—']);
		var w = Math.max(0, Math.min(100, pct));
		return E('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, [
			E('span', {
				style: 'display:inline-block;width:80px;height:10px;background:#ddd;border-radius:5px;overflow:hidden'
			}, [
				E('span', {
					style: 'display:block;height:100%;width:' + w + '%;' +
					       'background:' + (w > 60 ? '#4caf50' : w > 30 ? '#ff9800' : '#f44336') +
					       ';border-radius:5px;transition:width 0.3s'
				})
			]),
			E('span', { style: 'font-size:0.85em;color:#555' }, [ pct + '%' ])
		]);
	},

	/* Render a label with a hover tooltip (ⓘ icon using native title attribute) */
	_help: function(label, tip) {
		return E('span', { style: 'white-space:nowrap' }, [
			label, ' ',
			E('abbr', {
				title: tip,
				style: 'cursor:help;color:#888;font-size:0.8em;text-decoration:none;font-style:normal'
			}, [ 'ⓘ' ])
		]);
	},

	/* Build a two-column key/value table */
	_kvTable: function(rows) {
		var tbody = E('tbody');
		rows.forEach(function(r) {
			if (!r) return;
			tbody.appendChild(E('tr', {}, [
				E('td', { style: 'padding:3px 8px 3px 0;color:#666;white-space:nowrap;font-size:0.9em' }, [ r[0] ]),
				E('td', { style: 'padding:3px 0;font-weight:500' }, [ r[1] ])
			]));
		});
		return E('table', { style: 'border-collapse:collapse;width:100%' }, [ tbody ]);
	},

	/* ------------------------------------------------------------------ *
	 *  Render one interface card                                           *
	 * ------------------------------------------------------------------ */

	_renderCard: function(iface) {
		var self   = this;
		var name   = iface.interface || '?';
		var sig    = iface.signal      || {};
		var wifi   = iface.wifi        || {};
		var tc     = iface.tc          || {};
		var bbr    = iface.bbr         || {};
		var cong   = iface.congestion  || {};
		var bw     = iface.bandwidth   || {};
		var isWifi = sig.type === 'wifi';

		/* ---- connectivity rows ---- */
		var connRows = [
			[ self._help(_('Interface'), _('Logical UCI interface name')),  name ],
			[ self._help(_('Device'),    _('Physical network device (e.g. eth0, ppp0)')), iface.device || '—' ],
			[ self._help(_('Status'),    _('Link state as detected by omr-tracker')), self._statusBadge(iface.status) ],
			iface.status_msg ? [ self._help(_('Message'), _('Status detail from the last probe check')), iface.status_msg ] : null,
			[ self._help(_('IPv4'),      _('IPv4 address assigned to this interface')),    iface.device_ip  || '—' ],
			[ self._help(_('IPv6'),      _('IPv6 address assigned to this interface')),    iface.device_ip6 || '—' ],
			[ self._help(_('Gateway'),   _('IPv4 default gateway for this interface')),   iface.gateway    || '—' ],
			[ self._help(_('Gateway6'),  _('IPv6 default gateway for this interface')),   iface.gateway6   || '—' ],
		];

		/* ---- quality rows ---- */
		var qualRows = [
			[ self._help(_('Latency'),    _('Average round-trip time to the probe target in the last measurement')), self._fmt(iface.latency, 'ms', 1) ],
			[ self._help(_('RTT min'),    _('Lowest round-trip time ever seen — baseline for bufferbloat detection')), self._fmt(iface.rtt_min, 'ms', 1) ],
			[ self._help(_('RTT max'),    _('Highest round-trip time seen in the last measurement')), self._fmt(iface.rtt_max, 'ms', 1) ],
			[ self._help(_('Jitter'),     _('Variation in round-trip time — high values indicate an unstable link')), self._fmt(iface.jitter, 'ms', 1) ],
			[ self._help(_('Loss'),       _('Percentage of probe packets lost in the last measurement')), self._fmt(iface.loss, '%', 1) ],
			[ self._help(_('Congestion'), _('Composite score (0–100) computed from latency, loss, jitter, queue depth and signal quality')), self._congestionBar(cong.score, cong.level) ],
		];

		/* ---- signal rows ---- */
		var sigRows = [];
		if (isWifi) {
			sigRows = [
				[ self._help(_('Type'),     _('Signal source type (WiFi or cellular)')), 'WiFi' ],
				[ self._help(_('SSID'),     _('Wi-Fi network name')), wifi.ssid  || '—' ],
				[ self._help(_('BSSID'),    _('Access point MAC address')), wifi.bssid || '—' ],
				[ self._help(_('Channel'),  _('Wi-Fi channel in use')), self._fmt(wifi.channel, null) ],
				[ self._help(_('Mode'),     _('Wi-Fi operating mode (e.g. Master, Client)')), wifi.mode || '—' ],
				[ self._help(_('Signal'),   _('Received signal strength in dBm — less negative is better')), self._fmt(wifi.signal, 'dBm') ],
				[ self._help(_('Noise'),    _('Background noise floor in dBm')), self._fmt(wifi.noise, 'dBm') ],
				[ self._help(_('Bit rate'), _('Current negotiated radio transmission rate')), wifi.bitrate || '—' ],
				[ self._help(_('Quality'),  _('Link quality as a percentage of the maximum')), self._signalBar(
					wifi.quality != null && wifi.quality_max
						? Math.round(wifi.quality * 100 / wifi.quality_max)
						: null
				) ],
			];
		} else if (sig.type) {
			sigRows = [
				[ self._help(_('Type'),     _('Signal source type (WiFi or cellular)')), String(sig.type).toUpperCase() ],
				[ self._help(_('Operator'), _('Mobile network operator name')), sig.operator || '—' ],
				[ self._help(_('State'),    _('Connection state reported by the modem')), sig.state || '—' ],
				[ self._help(_('Quality'),  _('Signal quality percentage reported by the modem')), self._signalBar(sig.quality) ],
				[ self._help(_('RSSI'),     _('Received Signal Strength Indicator (dBm) — less negative is better')), self._fmt(sig.rssi, 'dBm') ],
				[ self._help(_('RSRP'),     _('Reference Signal Received Power (dBm, LTE) — less negative is better')), self._fmt(sig.rsrp, 'dBm') ],
				[ self._help(_('RSRQ'),     _('Reference Signal Received Quality (dB, LTE) — less negative is better')), self._fmt(sig.rsrq, 'dB') ],
				[ self._help(_('SINR'),     _('Signal to Interference and Noise Ratio (dB) — higher is better')), self._fmt(sig.sinr, 'dB') ],
			];
		}

		/* ---- BBR rows (only when BBR congestion control is active) ---- */
		var bbrRows = [];
		if (bbr.bw != null || bbr.pacing_rate != null || bbr.delivery_rate != null) {
			if (bbr.bw != null)
				bbrRows.push([ self._help(_('Bandwidth'),     _("BBR's estimated bottleneck bandwidth (filtered maximum delivery rate from active TCP connections)")), self._fmtBps(bbr.bw) ]);
			if (bbr.pacing_rate != null)
				bbrRows.push([ self._help(_('Pacing rate'),   _('Rate at which BBR paces packets — set to bandwidth × pacing gain during probing')), self._fmtBps(bbr.pacing_rate) ]);
			if (bbr.delivery_rate != null)
				bbrRows.push([ self._help(_('Delivery rate'), _('Actual measured data delivery rate to the receiver across active TCP connections')), self._fmtBps(bbr.delivery_rate) ]);
			if (bbr.cwnd != null)
				bbrRows.push([ self._help(_('Cwnd'),          _('Average TCP congestion window in segments across active connections')), self._fmt(bbr.cwnd, _('segs')) ]);
			if (bbr.min_rtt != null)
				bbrRows.push([ self._help(_('Min RTT'),       _('Minimum round-trip time observed by BBR — used as the propagation delay baseline')), self._fmt(bbr.min_rtt, 'ms', 3) ]);
			if (bbr.retrans != null)
				bbrRows.push([ self._help(_('Retrans'),       _('Total retransmissions across active TCP connections — any non-zero value indicates packet loss')), self._warnVal(bbr.retrans, 'error') ]);
		}

		/* ---- bandwidth rows ---- */
		var bwRows = [];
		if (bw.rx_bps != null || bw.tx_bps != null) {
			bwRows.push([ self._help(_('↓ RX'), _('Current receive rate measured over the last tracker interval')),  self._fmtBytesPerSec(bw.rx_bps) ]);
			bwRows.push([ self._help(_('↑ TX'), _('Current transmit rate measured over the last tracker interval')), self._fmtBytesPerSec(bw.tx_bps) ]);
			if (bw.rx_bytes != null)
				bwRows.push([ self._help(_('RX total'), _('Cumulative bytes received since boot')),    self._fmtBytes(bw.rx_bytes) ]);
			if (bw.tx_bytes != null)
				bwRows.push([ self._help(_('TX total'), _('Cumulative bytes transmitted since boot')), self._fmtBytes(bw.tx_bytes) ]);
		}

		/* ---- tc rows ---- */
		var tcRows = [];
		if (tc.qdisc != null) {
			tcRows.push([ self._help(_('Qdisc'),         _('Active queuing discipline (e.g. fq, cake, fq_codel)')), tc.qdisc ]);
			if (tc.sent_bytes != null)
				tcRows.push([ self._help(_('Sent'),       _('Total bytes and packets sent since the qdisc was created')), self._fmtBytes(tc.sent_bytes) + ' (' + (tc.sent_pkts || 0) + ' pkts)' ]);
			if (tc.dropped != null)
				tcRows.push([ self._help(_('Dropped'),    _('Packets discarded by the qdisc — high values indicate congestion')), self._warnVal(tc.dropped, 'error') ]);
			if (tc.overlimits != null)
				tcRows.push([ self._help(_('Overlimits'), _('Times the interface rate limit was exceeded')), String(tc.overlimits) ]);
			if (tc.backlog_bytes != null)
				tcRows.push([ self._help(_('Backlog'),    _('Bytes and packets currently waiting in the queue to be sent')), E('span', {}, [ self._warnVal(tc.backlog_bytes), ' B / ' + (tc.backlog_pkts || 0) + ' pkts' ]) ]);
			if (tc.ecn_mark != null)
				tcRows.push([ self._help(_('ECN mark'),   _('Packets marked for Explicit Congestion Notification instead of being dropped')), String(tc.ecn_mark) ]);
			if (tc.drop_overlimit != null)
				tcRows.push([ self._help(_('Drop overlimit'), _('Packets dropped because the queue length limit was exceeded')), self._warnVal(tc.drop_overlimit) ]);
			if (tc.flows != null)
				tcRows.push([ self._help(_('Flows'),      _('Number of active fair-queue flows')), String(tc.flows) ]);
			if (tc.throttled != null)
				tcRows.push([ self._help(_('Throttled'),  _('Flows currently paused by the scheduler')), self._warnVal(tc.throttled) ]);
			if (tc.flows_plimit != null)
				tcRows.push([ self._help(_('Flows plimit'), _('Flows dropped because the per-flow packet limit was reached')), self._warnVal(tc.flows_plimit) ]);
			if (tc.new_flow_count != null)
				tcRows.push([ self._help(_('New flows'),  _('New flows opened since the last measurement')), String(tc.new_flow_count) ]);
		}

		/* ---- timestamp ---- */
		var tsStr = '—';
		if (iface.timestamp) {
			var d = new Date(iface.timestamp * 1000);
			tsStr = d.toLocaleTimeString();
		}

		/* ---- assemble card ---- */
		var colStyle = 'flex:1;min-width:180px;padding:8px 12px;background:#f9f9f9;border-radius:4px';

		var cols = [
			E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('Connectivity') ]),
				self._kvTable(connRows)
			]),
			E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('Quality') ]),
				self._kvTable(qualRows)
			]),
		];

		if (bwRows.length) {
			cols.push(E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('Bandwidth') ]),
				self._kvTable(bwRows)
			]));
		}

		if (sigRows.length) {
			cols.push(E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('Signal') ]),
				self._kvTable(sigRows)
			]));
		}

		if (tcRows.length) {
			cols.push(E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('Traffic Control') ]),
				self._kvTable(tcRows)
			]));
		}

		if (bbrRows.length) {
			cols.push(E('div', { style: colStyle }, [
				E('h4', { style: 'margin:0 0 6px;font-size:0.95em;color:#333' }, [ _('BBR') ]),
				self._kvTable(bbrRows)
			]));
		}

		return E('div', {
			style: 'border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:16px;background:#fff'
		}, [
			E('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' }, [
				E('strong', { style: 'font-size:1.05em' }, [ name ]),
				E('span',   { style: 'font-size:0.8em;color:#888' }, [ _('Updated: ') + tsStr ])
			]),
			E('div', { style: 'display:flex;flex-wrap:wrap;gap:10px' }, cols)
		]);
	},

	/* ------------------------------------------------------------------ *
	 *  Build / update the full page                                        *
	 * ------------------------------------------------------------------ */

	_buildPage: function(data) {
		var self       = this;
		var ifaces     = (data && data.interfaces) ? data.interfaces : [];
		var container  = document.getElementById('omr-metrics-container');
		if (!container) return;

		/* Remove existing cards */
		while (container.firstChild) container.removeChild(container.firstChild);

		if (!ifaces.length) {
			container.appendChild(
				E('p', { style: 'color:#888;font-style:italic' },
				  [ _('No metrics available yet. Waiting for omr-tracker to run…') ])
			);
			return;
		}

		ifaces.forEach(function(iface) {
			var n = (iface.interface || '').toLowerCase();
			if (n === 'omrvpn' || n === 'owvpn') return;
			container.appendChild(self._renderCard(iface));
		});
	},

	render: function(data) {
		var self = this;

		var view = E('div', {}, [
			E('h2', {}, [ _('WAN Metrics') ]),
			E('p', { style: 'color:#555;margin-bottom:16px' }, [
				_('Live per-interface metrics collected by omr-tracker. Refreshes every %d seconds.').format(self.POLL_INTERVAL)
			]),
			E('div', { id: 'omr-metrics-container' })
		]);

		self._buildPage(data);

		poll.add(function() {
			return callMetricsGetAll().then(function(d) {
				self._buildPage(d);
			});
		}, self.POLL_INTERVAL);

		return view;
	},

	handleSaveApply: null,
	handleSave:      null,
	handleReset:     null
});
