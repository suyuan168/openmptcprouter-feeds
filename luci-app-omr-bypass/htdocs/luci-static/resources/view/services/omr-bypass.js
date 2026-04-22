'use strict';
'require rpc';
'require form';
'require fs';
'require uci';
'require tools.widgets as widgets';

var callHostHints;

return L.view.extend({
	callHostHints: rpc.declare({
		object: 'luci-rpc',
		method: 'getHostHints',
		expect: { '': {} }
	}),

	load: function() {
		return Promise.all([
			L.resolveDefault(fs.stat('/proc/net/xt_ndpi/proto'), null),
			this.callHostHints(),
			L.resolveDefault(fs.read_direct('/proc/net/xt_ndpi/proto'), ''),
			L.resolveDefault(fs.read_direct('/proc/net/xt_ndpi/host_proto'), ''),
			fs.read_direct('/usr/share/omr-bypass/omr-bypass-proto.lst'),
			L.resolveDefault(fs.stat('/usr/sbin/ndpisrvd'), null)
		]);
	},

	render: function(testhosts) {
		var m, s, o, hosts;
		hosts = testhosts[1];

		m = new form.Map('omr-bypass', _('OMR-Bypass'),_('OpenMPTCProuter IP must be used as DNS.'));

		/*
		s = m.section(form.TypedSection, 'global', _('Global settings'));
		s.addremove = false;
		s.anonymous = true;

		o = s.option(form.Flag, 'noipv6', _('Disable IPv6 AAAA DNS results for bypassed domains'));
		o.default = o.disabled;
		o.optional = true;
		*/
		
		s = m.section(form.GridSection, 'domains', _('Domains'),
			_('Create rules that match destination domain names. Domain-based bypass requires OpenMPTCProuter DNS to be used by clients.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'name', _('Domain'),
			_('Enter a domain name to route through the selected interface or the server VPN.'));
		o.rmempty = false;

		o = s.option(form.Flag, 'vpn', _('VPN on server'),_('Bypass using VPN configured on server.'));
		o.modalonly = true

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;
		o.depends('vpn', '0');

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		o = s.option(form.ListValue, 'family', _('Restrict to address family'),
			_('Limit the rule to IPv4 results, IPv6 results, or allow both.'));
		o.value('ipv4ipv6', _('IPv4 and IPv6'));
		o.value('ipv4', _('IPv4 only'));
		o.value('ipv6', _('IPv6 only'));
		o.default = 'ipv4ipv6';
		o.modalonly = true

		o = s.option(form.ListValue, 'proto', _('protocol'),
			_('Restrict the matched traffic to a specific transport protocol.'));
		o.default = 'all';
		o.rmempty = false;
		o.value('all');
		o.value('tcp');
		o.value('udp');
		o.modalonly = true

		o = s.option(form.Flag, 'noipv6', _('Disable AAAA IPv6 DNS'),
			_('Ignore IPv6 AAAA DNS answers for this rule and only use IPv4 results.'));
		o.default = o.enabled;
		o.modalonly = true

		s = m.section(form.GridSection, 'ips', _('IPs and Networks'),
			_('Create rules that match destination IP addresses or networks directly.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'ip', _('IP'),
			_('Enter a destination IP address or network in CIDR notation.'));
		o.rmempty = false;

		o = s.option(form.Flag, 'vpn', _('VPN on server'),_('Bypass using VPN configured on server.'));
		o.modalonly = true

		o = s.option(form.ListValue, 'proto', _('protocol'),
			_('Restrict the matched traffic to a specific transport protocol.'));
		o.default = 'all';
		o.rmempty = false;
		o.value('all');
		o.value('tcp');
		o.value('udp');
		o.modalonly = true

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;
		o.depends('vpn', '0');

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'dest_port', _('Ports destination'),
			_('Create rules that match destination ports, for example to steer selected services.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'dport', _('port'),
			_('Destination port number to match.'));
		o.rmempty = false;

		o = s.option(form.ListValue, 'proto', _('protocol'),
			_('Protocol to match for this destination port rule.'));
		o.default = 'tcp';
		o.rmempty = false;
		o.value('tcp');
		o.value('udp');
		o.value('icmp');

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'src_port', _('Ports source'),
			_('Create rules that match source ports generated by local applications or devices.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'sport', _('port'),
			_('Source port number to match.'));
		o.rmempty = false;

		o = s.option(form.ListValue, 'proto', _('protocol'),
			_('Protocol to match for this source port rule.'));
		o.default = 'tcp';
		o.rmempty = false;
		o.value('tcp');
		o.value('udp');
		o.value('icmp');

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'macs', _('MAC-Address'),
			_('Create rules that match traffic from specific client devices by MAC address.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'mac', _('source MAC-Address'),
			_('Match traffic coming from this client MAC address.'));
		o.datatype = 'list(unique(macaddr))';
		o.rmempty = false;
		Object.keys(hosts).forEach(function(mac) {
			var hint = hosts[mac].name || hosts[mac].ipv4;
			o.value(mac, hint ? '%s (%s)'.format(mac, hint) : mac);
		});

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'lan_ip', _('Source lan IP address or network'),
			_('Create rules that match traffic from a local source IP address or subnet.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'ip', _('IP Address'),
			_('Enter a source LAN IP address to match.'));
		o.datatype = 'or(ip4addr,ip6addr)';
		o.rmempty = false;
		Object.keys(hosts).forEach(function(mac) {
			if (hosts[mac].ipv4) {
				var hint = hosts[mac].name;
				o.value(hosts[mac].ipv4, hint ? '%s (%s)'.format(hosts[mac].ipv4, hint) : hosts[mac].ipv4);
			}
		});

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'asns', _('ASN'),
			_('Create rules that match destinations announced by a specific autonomous system number.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.Value, 'asn', _('ASN'),
			_('Enter the autonomous system number to match.'));
		o.rmempty = false;

		o = s.option(form.Flag, 'vpn', _('VPN on server'),_('Bypass using VPN configured on server.'));
		o.modalonly = true

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used.'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;
		o.depends('vpn', '0');

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		s = m.section(form.GridSection, 'dpis', _('Protocols and services'),
			_('Create rules that match application protocols or services detected by nDPI.'));
		s.addremove = true;
		s.anonymous = true;
		s.nodescriptions = true;

		o = s.option(form.Flag, 'enabled', _('Enabled'),
			_('Enable or disable this bypass rule without deleting it.'));
		o.default = o.enabled;

		o = s.option(form.ListValue, 'proto', _('Protocol/Service'),
			_('Select the application protocol or service name to match.'));
		o.rmempty = false;
		o.load = function(section_id) {
			var proto = testhosts[2].split(/\n/),
			    host = testhosts[3].split(/\n/),
			    protofile = testhosts[4].split(/\n/),
			    name = [];
			if (proto.length > 2) {
				for (var i = 0; i < proto.length; i++) {
					var m = proto[i].split(/\s+/);
					if (m && m[0] != "#id" && m[1] != "disabled")
					    name.push(m[2]);
				}
			}
			if (host.length > 2) {
				for (var i = 0; i < host.length; i++) {
					var m = host[i].split(/:/);
					if (m && m[0] != "#Proto")
					  name.push(m[0].toLowerCase());
				}
			}
			if (proto.length == 1 && host.length == 1) {
				for (var i = 0; i < protofile.length; i++) {
					var m = protofile[i];
					name.push(m);
				}
			}
			if (host.length > 2) {
				name = Array.from(new Set(name)).sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase())}).reduce(function(a, b){ if (a.slice(-1)[0] !== b) a.push(b);return a;},[]);
			}
			for (var i = 0; i < name.length; i++) {
				this.value(name[i]);
			}
			return this.super('load', [section_id]);
		
		};

		o = s.option(form.Flag, 'vpn', _('VPN on server'),_('Bypass using VPN configured on server.'));
		o.modalonly = true

		o = s.option(widgets.DeviceSelect, 'interface', _('Output interface'),_('When none selected, MPTCP master interface is used (or an other interface if master is down).'));
		o.noaliases = true;
		o.noinactive = true;
		o.nocreate    = true;
		o.depends('vpn', '0');

		o = s.option(form.Value, 'note', _('Note'),
			_('Optional comment to help identify the purpose of this rule.'));
		o.rmempty = true;

		o = s.option(form.ListValue, 'family', _('Restrict to address family'),
			_('Limit the rule to IPv4 results, IPv6 results, or allow both.'));
		o.value('ipv4ipv6', _('IPv4 and IPv6'));
		o.value('ipv4', _('IPv4 only'));
		o.value('ipv6', _('IPv6 only'));
		o.default = 'ipv4ipv6';
		o.modalonly = true

		o = s.option(form.ListValue, 'proto', _('protocol'),
			_('Restrict the matched traffic to a specific transport protocol.'));
		o.default = 'all';
		o.rmempty = false;
		o.value('all');
		o.value('tcp');
		o.value('udp');
		o.modalonly = true

		o = s.option(form.Flag, 'noipv6', _('Disable AAAA IPv6 DNS'),
			_('Ignore IPv6 AAAA DNS answers for this rule and only use IPv4 results.'));
		o.default = true;
		o.modalonly = true

		if (testhosts[0] || testhosts[5]) {
			o = s.option(form.Flag, 'ndpi', _('Enable ndpi'),
				_('Enable deep packet inspection for this rule when nDPI support is available.'));
			o.default = o.enabled;
			o.modalonly = true
			o.depends('vpn', '0');
		}

		return m.render();
	}
});
