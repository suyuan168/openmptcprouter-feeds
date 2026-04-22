'use strict';
'require view';
'require form';
'require uci';
'require network';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('omr-quota'),
			network.getNetworks()
		]);
	},

	render: function(data) {
		var networks = (data[1] || []).filter(function(n) {
			return n.getName() !== 'loopback';
		});

		var m, s, o;

		m = new form.Map('omr-quota', _('Monthly Quota'),
			_('Set monthly quota, when quota is reached interface state is set to down'));

		s = m.section(form.TypedSection, 'interface', _('Interfaces'));
		s.addremove = true;
		s.anonymous = false;
		s.addbtntitle = _('Add interface…');

		s.handleAdd = function(ev) {
			this.sectiontype = 'interface';
			var promise = form.TypedSection.prototype.handleAdd.apply(this, arguments);
			this.sectiontype = undefined;
			return promise;
		};

		s.sectiontitle = function(section_id) {
			return section_id;
		};

		s.renderSectionAdd = function(extra_class) {
			var el = form.TypedSection.prototype.renderSectionAdd.apply(this, arguments);
			var input = el.querySelector('.cbi-section-create-name');
			if (input) {
				var select = E('select', { 'class': 'cbi-section-create-name' });
				select.appendChild(E('option', { 'value': '' }, _('-- select interface --')));
				networks.forEach(function(n) {
					select.appendChild(E('option', { 'value': n.getName() }, n.getName()));
				});
				input.parentNode.replaceChild(select, input);
			}
			return el;
		};

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.rmempty = false;

		o = s.option(form.Value, 'txquota', _('TX quota (kbit)'));
		o.datatype = 'uinteger';
		o.placeholder = '0';

		o = s.option(form.Value, 'rxquota', _('RX quota (kbit)'));
		o.datatype = 'uinteger';
		o.placeholder = '0';

		o = s.option(form.Value, 'ttquota', _('TX+RX quota (kbit)'));
		o.datatype = 'uinteger';
		o.placeholder = '0';

		o = s.option(form.Value, 'interval', _('Interval between check (s)'));
		o.datatype = 'uinteger';
		o.placeholder = '60';

		return m.render();
	}
});
