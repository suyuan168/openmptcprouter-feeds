
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=omr-metrics
PKG_VERSION:=0.01
PKG_RELEASE:=1

include $(INCLUDE_DIR)/package.mk

MY_DEPENDS := \
    omr-tracker

define Package/$(PKG_NAME)
SECTION:=OMR
CATEGORY:=OMR
DEPENDS:=$(foreach p,$(MY_DEPENDS),+$(p))
TITLE:=OMR-Tracker metrics
endef

define Package/$(PKG_NAME)/description
OpenMPTCProuter Metrics package
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/$(PKG_NAME)
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(CP) ./files/* $(1)/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
