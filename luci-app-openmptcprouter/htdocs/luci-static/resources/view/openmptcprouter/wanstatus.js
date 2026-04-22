'use strict';
'require view';
'require form';
'require poll';
'require rpc';

var callOMRStatus = rpc.declare({
	object: 'openmptcprouter',
	method: 'status',
	expect: { '': {} }
});

return view.extend({
	load: function() {
		return callOMRStatus();
	},


	pollData: function() {
		poll.add(L.bind(function() {
			return callOMRStatus().then(L.bind(function(data) {
				this.renderStatus(data || {});
			}, this)).catch(function() {
				/* Ignore transient poll errors */
			});
		}, this), 10);
	},

	esc: function(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	},

	getCookie: function(name) {
		var m = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
		return m ? m[2] : '';
	},

	setCookie: function(name, value) {
		document.cookie = name + '=' + value + '; path=/cgi-bin/luci/';
	},

	testPrivateIP: function(ip) {
		return /^(10)\.|^(172)\.(1[6-9]|2[0-9]|3[0-1])\.|^(192)\.(168)\./.test(ip || '');
	},

	replaceLastNChars: function(str, replace, num) {
		if (!str) return str || '';
		return str.slice(0, -num) + new Array(num + 1).join(replace);
	},

	formatBytes: function(bytes) {
		bytes = Number(bytes) || 0;
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
		if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
		if (bytes < 1099511627776) return (bytes / 1073741824).toFixed(2) + ' GB';
		return (bytes / 1099511627776).toFixed(2) + ' TB';
	},

	renderSignalBars: function(percent) {
		var n = Math.min(5, Math.max(0, Math.round((percent || 0) / 20)));
		var color = n >= 4 ? 'var(--c-ok)' : (n >= 2 ? 'var(--c-warn)' : 'var(--c-err)');
		var html = '<span style="display:inline-flex;align-items:flex-end;gap:2px;height:16px;vertical-align:middle;" title="' + this.esc(String(percent)) + '%">';
		for (var i = 1; i <= 5; i++) {
			var h = (4 + i * 3) + 'px';
			var bg = i <= n ? color : 'var(--c-line)';
			html += '<span style="display:inline-block;width:4px;height:' + h + ';background:' + bg + ';border-radius:1px;"></span>';
		}
		html += '</span>';
		return html;
	},

	stringToColour: function(str) {
		var fixed = {
			wan1: 'BlueViolet', wan2: 'DeepSkyBlue', wan3: 'LightGreen', wan4: 'PowderBlue',
			wan5: 'PaleGreen', wan6: 'YellowGreen', wan7: 'SeaGreen', wan8: 'SteelBlue'
		};
		if (fixed[str]) return fixed[str];
		var h = 0;
		for (var i = 0; i < (str || '').length; i++)
			h = ((h << 5) - h) + str.charCodeAt(i);
		var color = '#';
		for (var j = 0; j < 3; j++) {
			var v = (h >> (j * 8)) & 0xFF;
			color += ('00' + v.toString(16)).slice(-2);
		}
		return color;
	},

	getNetworkNodeTemplate: function(icon, title, nodeClass, statusMessage, content, badge) {
		return String.format(
			'<div class="network-node %s">' +
				'<div class="node-icon">%s</div>' +
				'<div class="node-body">' +
					'<div class="node-title">%s</div>' +
					'<div class="node-status">%s</div>' +
					'<div class="node-details">%s</div>' +
				'</div>' +
				'%s' +
				'<div class="node-dot"></div>' +
			'</div>',
			nodeClass || 'ok', icon || '', title || '', statusMessage || '', content || '',
			badge || ''
		);
	},

	renderWanNode: function(wan, anonymize) {
		var statusClass = wan.status === 'ERROR' ? 'error' : (wan.status === 'WARNING' ? 'warning' : 'ok');
		var title = this.esc(wan.label || wan.name || 'WAN');
		var icon = String.format(
			'<embed id="modem_%s" onload="window.omrSetColorSVG(\'modem_%s\', \'%s\')" src="%s/modem.svg" />',
			this.esc(wan.name || 'wan'), this.esc(wan.name || 'wan'), this.esc(this.stringToColour(wan.name || 'wan')), L.resource()
		);
		var statusMessage = '';
		if (!wan.ipaddr && !wan.ip6addr) statusMessage += _('No IP defined') + '<br />';
		if (!wan.gateway && !wan.gateway6) statusMessage += _('No gateway defined') + '<br />';
		var noGwCheck = /^(modemmanager|qmi|mbim|3g)$/i.test(wan.proto || '');
		if (!noGwCheck && wan.gateway && wan.gw_ping === 'DOWN') statusMessage += _('Gateway DOWN') + '<br />';
		if (!noGwCheck && wan.ip6addr && wan.gateway6 && wan.gw_ping6 === 'DOWN') statusMessage += _('Gateway IPv6 DOWN') + '<br />';
		if (wan.server_ping === 'DOWN') statusMessage += _('No Server ping response after 1 second') + '<br />';
		if (wan.server_http === 'DOWN') statusMessage += _('No Server http response after 1 second') + '<br />';
		if (wan.zonewan === 'NO') statusMessage += _('Network interface not in WAN firewall zone') + '<br />';

		var wanip = wan.wanip || '';
		var gateway = wan.gateway || '';
		if (anonymize) {
			if (wanip && !this.testPrivateIP(wanip)) wanip = this.replaceLastNChars(wanip, 'x', 6);
			if (gateway && !this.testPrivateIP(gateway)) gateway = this.replaceLastNChars(gateway, 'x', 6);
		}

		var details = '';
		if (wan.ipaddr) details += _('ip address:') + ' <strong>' + this.esc(wan.ipaddr) + '</strong><br />';
		if (wan.ip6addr) details += _('ipv6 address:') + ' <strong>' + this.esc(wan.ip6addr) + '</strong><br />';
		if (wanip) details += _('wan address:') + ' <strong>' + this.esc(wanip) + '</strong><br />';
		if (wan.wanip6) details += _('wan ipv6 address:') + ' <strong>' + this.esc(wan.wanip6) + '</strong><br />';
		if (wan.ifname && wan.ifname !== wan.label) details += _('interface:') + ' ' + this.esc(wan.ifname) + '<br />';
		if (gateway) details += _('gateway:') + ' <strong>' + this.esc(gateway) + '</strong><br />';
		if (wan.latency) details += _('latency:') + ' ' + this.esc(wan.latency) + ' ms<br />';
		details += _('multipath:') + ' ' + this.esc(wan.multipath || 'off') + '<br />';
		if (wan.operator) details += _('operator:') + ' <strong>' + this.esc(wan.operator) + '</strong><br />';
		if (wan.phonenumber) details += _('number:') + ' <strong>' + this.esc(wan.phonenumber) + '</strong><br />';
		if (wan.donglestate) details += _('state:') + ' <strong>' + this.esc(wan.donglestate) + '</strong><br />';

		var badge = '';
		if (wan.signal || wan.networktype) {
			badge = '<div class="node-badge">';
			if (wan.signal) badge += this.renderSignalBars(Number(wan.signal));
			if (wan.networktype) badge += '<span class="node-badge-type">' + this.esc(wan.networktype) + '</span>';
			badge += '</div>';
		}

		return '<li><a href="#">' + this.getNetworkNodeTemplate(icon, title, statusClass, statusMessage, details, badge) + '</a></li>';
	},

	render: function(initialData) {
		if (!document.querySelector('link[href*="wanstatus.css"]')) {
			var link = document.createElement('link');
			link.rel = 'stylesheet';
			link.type = 'text/css';
			link.href = L.resource('openmptcprouter/css/wanstatus.css');
			document.head.appendChild(link);
		}

		this.m = new form.Map('openmptcprouter', _('Settings'));
		var s = this.m.section(form.NamedSection, 'settings', 'settings');
		s.addremove = false;
		var o = s.option(form.Flag, '_anonymize', _('Anonymize public IPs'));
		o.default = '0';
		o.cfgvalue = L.bind(function() {
			return this.getCookie('anonymize') === 'true' ? '1' : '0';
		}, this);
		o.write = L.bind(function(sid, val) {
			this.setCookie('anonymize', val === '1' ? 'true' : 'false');
		}, this);
		o.remove = L.bind(function(sid) {
			this.setCookie('anonymize', 'false');
		}, this);

		return this.m.render().then(L.bind(function(formEl) {
			formEl.insertBefore(
				E('fieldset', { 'id': 'interface_field', 'class': 'cbi-section' }, [
					E('div', { 'id': 'omr-status-container' }, E('img', { 'src': L.resource('spinner.gif') }))
				]),
				formEl.firstChild
			);
			formEl.insertBefore(E('h2', {}, _('Network overview')), formEl.firstChild);

			if (initialData) this.renderStatus(initialData);
			this.pollData();
			window.omrSetColorSVG = function(embedId, color) {
				var embed = document.getElementById(embedId);
				if (!embed) return;
				var svg;
				try {
					svg = embed.getSVGDocument ? embed.getSVGDocument() : embed.contentDocument;
				} catch (e) {
					svg = null;
				}
				if (svg) {
					var back = svg.getElementById('backgound_modem');
					if (back) back.setAttribute('style', 'fill: ' + color + ';fill-opacity:0.6;');
				}
			};

			return formEl;
		}, this));
	},

	handleSave: function() {
		return this.m.parse().then(function() {
			window.location.reload();
		});
	},

	renderStatus: function(data) {
		var c = document.getElementById('omr-status-container');
		if (!c) return;
		var d = data || {};
		var omr = d.openmptcprouter || {};

		if (!omr.hostname && !omr.local_addr && !d.wans) return;

		var wans = d.wans || [];
		var tunnels = d.tunnels || [];
		var anonymize = this.getCookie('anonymize') === 'true';

		var remoteAddr = omr.remote_addr || '';
		if (anonymize && remoteAddr) remoteAddr = this.replaceLastNChars(remoteAddr, 'x', 6);
		var clientTitle = remoteAddr ? String.format('%s (%s)', this.esc(omr.remote_hostname || _('You')), this.esc(remoteAddr)) : _('Clients');
		var clientStatusClass = (omr.remote_from_lease === false) ? 'warning' : 'ok';
		var clientMsg = (omr.remote_from_lease === false) ? _('Your IP was not leased by this router') : '';

		var routerTitle = String.format('%s (%s)', this.esc(omr.hostname || 'OpenMPTCProuter'), this.esc(omr.local_addr || ''));
		var routerDetails = '';
		if (omr.version) routerDetails += _('Version') + ' ' + this.esc(omr.version) + '<br />';
		if (omr.loadavg) routerDetails += _('Load:') + ' ' + this.esc(omr.loadavg) + '<br />';
		if (omr.uptime) routerDetails += _('Uptime:') + ' ' + this.esc(String.format('%t', omr.uptime)) + '<br />';
		if (omr.proxy) routerDetails += _('Proxy:') + ' ' + this.esc(omr.proxy) + '<br />';
		if (omr.vpn) routerDetails += _('VPN:') + ' ' + this.esc(omr.vpn) + '<br />';
		var routerWarn = '';
		if (omr.dns === false) routerWarn += _('DNS issue: can\'t resolve hostname') + '<br />';
		if (omr.tun_state === 'DOWN') routerWarn += _('VPN tunnel DOWN') + '<br />';
		if (omr.ipv6 === 'enabled' && omr.tun6_state === 'DOWN') routerWarn += _('IPv6 tunnel DOWN') + '<br />';

		var serverAddr = omr.service_addr || '';
		if (anonymize && serverAddr) serverAddr = this.replaceLastNChars(serverAddr, 'x', 6);
		var serverTitle = String.format('%s (%s)', this.esc(omr.vps_hostname || _('Server')), this.esc(serverAddr || '-'));
		var serverStatus = '';
		if (!omr.service_addr) serverStatus += _('No server defined') + '<br />';
		if (omr.vps_status === 'DOWN') serverStatus += _('Can\'t ping server') + '<br />';
		var serverDetails = '';
		if (omr.vps_omr_version) serverDetails += _('Version') + ' ' + this.esc(omr.vps_omr_version) + '<br />';
		if (omr.vps_kernel) serverDetails += _('Kernel:') + ' ' + this.esc(omr.vps_kernel) + '<br />';
		if (omr.vps_loadavg) serverDetails += _('Load:') + ' ' + this.esc(omr.vps_loadavg) + '<br />';
		if (omr.vps_uptime) serverDetails += _('Uptime:') + ' ' + this.esc(String.format('%t', omr.vps_uptime)) + '<br />';
		if (omr.proxy_traffic != null && omr.proxy_traffic != 0) serverDetails += _('Proxy traffic:') + ' ' + this.formatBytes(omr.proxy_traffic) + '<br />';
		if (omr.vpn_traffic != null && omr.vpn_traffic != 0) serverDetails += _('VPN traffic:') + ' ' + this.formatBytes(omr.vpn_traffic) + '<br />';
		if (omr.total_traffic != null && omr.total_traffic != 0) serverDetails += _('Total traffic:') + ' ' + this.formatBytes(omr.total_traffic) + '<br />';

		var temp = '<figure class="tree"><ul>';
		temp += '<li class="remote-from-lease"><a href="#">' +
			this.getNetworkNodeTemplate('<img src="' + L.resource('computer.png') + '" />', clientTitle, clientStatusClass, clientMsg, '') +
			'</a></li>';
		temp += '<li id="networkRootNode"><table><tr><td><table>';
		if (wans.length + tunnels.length > 0) {
			for (var i = 0; i < (wans.length + tunnels.length - 1); i++)
				temp += '<tr class="spaceline"><td></td></tr>';
		}
		temp += '<tr><td><a href="#" id="omr">' +
			this.getNetworkNodeTemplate('<img src="' + L.resource('openmptcprouter.png') + '" />', routerTitle, routerWarn ? 'warning' : 'ok', routerWarn, routerDetails) +
			'</a></td></tr>';
		if (omr.direct_output) {
			var directIp = omr.wan_addr || '';
			if (anonymize && directIp && !this.testPrivateIP(directIp)) directIp = this.replaceLastNChars(directIp, 'x', 6);
			var directDetails = directIp ? (_('ip address:') + ' <strong>' + this.esc(directIp) + '</strong><br />') : '';
			temp += '<tr><td><div class="vertdash"></div></td></tr>';
			temp += '<tr><td><span id="omr-direct">' +
				this.getNetworkNodeTemplate('<img src="' + L.resource('computer.png') + '" />', _('Direct Output'), 'ok', '', directDetails) +
				'</span></td></tr>';
			temp += '<tr><td style="height:1em;"></td></tr>';
			temp += '<tr><td><a href="' + L.url('admin/system/openmptcprouter/wizard') + '" id="omr-vps">' +
				this.getNetworkNodeTemplate('<img src="' + L.resource('server.png') + '" />', serverTitle, serverStatus ? 'warning' : 'ok', serverStatus, serverDetails) +
				'</a></td></tr>';
		} else {
			temp += '<tr><td><div class="vertdash"></div></td></tr>';
			temp += '<tr><td><a href="' + L.url('admin/system/openmptcprouter/wizard') + '" id="omr-vps">' +
				this.getNetworkNodeTemplate('<img src="' + L.resource('server.png') + '" />', serverTitle, serverStatus ? 'warning' : 'ok', serverStatus, serverDetails) +
				'</a></td></tr>';
		}
		temp += '</table></td><td>';

		if (wans.length || tunnels.length) {
			temp += '<ul>';
			for (var w = 0; w < wans.length; w++)
				temp += this.renderWanNode(wans[w], anonymize);
			for (var t = 0; t < tunnels.length; t++)
				temp += this.renderWanNode(tunnels[t], anonymize);
			temp += '</ul>';
		} else {
			temp += '<ul><li>' + this.esc(_('No WAN with multipath enabled')) + '</li></ul>';
		}
		temp += '</td></tr></table></li></ul></figure>';
		c.innerHTML = temp;

		requestAnimationFrame(function() {
			var omrEl = c.querySelector('#omr .network-node');
			var wanUl = c.querySelector('#networkRootNode td > ul');
			if (omrEl && wanUl) {
				var omrRect = omrEl.getBoundingClientRect();
				var ulRect  = wanUl.getBoundingClientRect();
				var connTop = (omrRect.top + omrRect.height / 2) - ulRect.top;
				if (connTop > 0)
					wanUl.style.setProperty('--wan-connector-top', connTop + 'px');
			}
		});

		var fig = c.querySelector('figure.tree');
		if (fig) {
			var n = wans.length + tunnels.length;
			var lineH = (70 + Math.max(0, n - 1) * 55) + 'px';
			fig.style.setProperty('--remote-line-h', lineH);
		}
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
