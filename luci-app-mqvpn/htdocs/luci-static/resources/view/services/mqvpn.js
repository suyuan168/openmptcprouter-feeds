'use strict';
'require form';
'require uci';

return L.view.extend({
	load: function() {
		return uci.load('mqvpn');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('mqvpn', _('MQVPN'), _('QUIC-based VPN tunnel'));

		s = m.section(form.NamedSection, 'settings', 'settings', _('General'));
		s.addremove = false;

		o = s.option(form.Flag, 'enable', _('Enabled'));
		o.default = o.disabled;

		s = m.section(form.NamedSection, 'server', 'server', _('Server'));
		s.addremove = false;

		o = s.option(form.Value, 'ip', _('Server IP'));
		o.description = _('IPv4 or IPv6 address of the MQVPN server');
		o.datatype = 'ipaddr';
		o.rmempty = false;

		o = s.option(form.Value, 'port', _('Server port'));
		o.datatype = 'port';
		o.placeholder = '443';
		o.rmempty = false;

		o = s.option(form.Flag, 'insecure', _('Insecure TLS'));
		o.description = _('Skip TLS certificate verification');
		o.default = o.enabled;

		s = m.section(form.NamedSection, 'auth', 'auth', _('Authentication'));
		s.addremove = false;

		o = s.option(form.Value, 'user', _('User'));
		o.rmempty = true;

		o = s.option(form.Value, 'key', _('Key'));
		o.rmempty = false;
		o.password = true;

		s = m.section(form.NamedSection, 'interface', 'interface', _('Interface'));
		s.addremove = false;

		o = s.option(form.Value, 'tun_name', _('Tunnel name'));
		o.default = 'mqvpn0';
		o.rmempty = true;

		o = s.option(form.ListValue, 'log_level', _('Log level'));
		o.value('debug', _('Debug'));
		o.value('info',  _('Info'));
		o.value('warn',  _('Warning'));
		o.value('error', _('Error'));
		o.default = 'info';

		o = s.option(form.Flag, 'kill_switch', _('Kill switch'));
		o.description = _('Block all traffic if the VPN tunnel goes down');
		o.default = o.disabled;

		o = s.option(form.Flag, 'reconnect', _('Reconnect'));
		o.description = _('Automatically reconnect on failure');
		o.default = o.enabled;

		o = s.option(form.Value, 'reconnect_interval', _('Reconnect interval'));
		o.description = _('Seconds between reconnection attempts');
		o.datatype = 'uinteger';
		o.default = '5';
		o.depends('reconnect', '1');

		o = s.option(form.Flag, 'route_via_server', _('Route via server'));
		o.description = _('Add a host route to the server IP before setting the default route');
		o.default = o.disabled;

		o = s.option(form.Flag, 'no_routes', _('No automatic routes'));
		o.description = _('Skip all automatic route setup and manage routes manually');
		o.default = o.disabled;

		o = s.option(form.DynamicList, 'dns', _('DNS servers'));
		o.datatype = 'ipaddr';
		o.rmempty = true;

		s = m.section(form.NamedSection, 'control', 'control', _('Control API'));
		s.addremove = false;

		o = s.option(form.Value, 'control_port', _('Port'));
		o.description = _('TCP port for the JSON control API (leave empty to disable)');
		o.datatype = 'port';
		o.placeholder = '9091';
		o.rmempty = true;

		o = s.option(form.Value, 'control_addr', _('Bind address'));
		o.description = _('Address to bind the control API (default: 127.0.0.1)');
		o.datatype = 'ipaddr';
		o.placeholder = '127.0.0.1';
		o.rmempty = true;

		s = m.section(form.NamedSection, 'multipath', 'multipath', _('Multipath'));
		s.addremove = false;

		o = s.option(form.ListValue, 'scheduler', _('Scheduler'));
		o.value('wlb',    _('Weighted Load Balancing'));
		o.value('minrtt', _('Minimum RTT'));
		o.default = 'wlb';

		o = s.option(form.Flag, 'auto_wan', _('Auto WAN'));
		o.description = _('Automatically add WAN interfaces as multipath paths. If disabled, use the paths defined below.');
		o.default = o.enabled;

		o = s.option(form.DynamicList, 'path', _('Paths'));
		o.description = _('Network interfaces to use as multipath paths');
		o.rmempty = true;
		o.depends('auto_wan', '0');

		o = s.option(form.DynamicList, 'backup_path', _('Backup paths'));
		o.description = _('Network interfaces to use as backup multipath paths');
		o.rmempty = true;
		o.depends('auto_wan', '0');

		return m.render();
	}
});
